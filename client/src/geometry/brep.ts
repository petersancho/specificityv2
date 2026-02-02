import { triangulatePolygon } from "./triangulate";
import type {
  BRepCurve,
  BRepData,
  BRepEdge,
  BRepFace,
  BRepLoop,
  BRepSurface,
  BRepGeometry,
  RenderMesh,
  Vec3,
} from "../types";
import { mergeRenderMeshes } from "../utils/meshIo";
import { tessellateCurveAdaptive, tessellateSurfaceAdaptive } from "./tessellation";
import {
  add,
  buildPlaneFromNormal,
  cross,
  normalize,
  projectPointToPlane,
  unprojectPointFromPlane,
  EPSILON,
} from "./math";
import {
  createNurbsBoxSurfaces,
  createNurbsCylinderSurface,
  createNurbsSphereSurface,
} from "./nurbsPrimitives";
import { createCircleNurbs } from "./arc";

const toVec3 = (positions: number[], index: number): Vec3 => ({
  x: positions[index * 3] ?? 0,
  y: positions[index * 3 + 1] ?? 0,
  z: positions[index * 3 + 2] ?? 0,
});

const ensureIndices = (mesh: RenderMesh) => {
  if (mesh.indices.length > 0) return mesh.indices;
  const count = Math.floor(mesh.positions.length / 3);
  return Array.from({ length: count }, (_, index) => index);
};

const collectLoopPoints = (
  loop: BRepLoop,
  edgesById: Map<string, BRepData["edges"][number]>,
  verticesById: Map<string, Vec3>
) => {
  const points: Vec3[] = [];
  loop.edges.forEach((oriented, edgeIndex) => {
    const edge = edgesById.get(oriented.edgeId);
    if (!edge) return;
    const [startId, endId] = oriented.reversed
      ? [edge.vertices[1], edge.vertices[0]]
      : edge.vertices;
    const start = verticesById.get(startId);
    const end = verticesById.get(endId);
    if (!start || !end) return;
    if (edge.curve.kind === "line") {
      if (edgeIndex === 0 || points.length === 0) {
        points.push(start);
      } else {
        const last = points[points.length - 1];
        if (
          Math.abs(last.x - start.x) > EPSILON.DISTANCE ||
          Math.abs(last.y - start.y) > EPSILON.DISTANCE ||
          Math.abs(last.z - start.z) > EPSILON.DISTANCE
        ) {
          points.push(start);
        }
      }
      return;
    }
    if (edge.curve.kind === "nurbs") {
      const tessellated = tessellateCurveAdaptive(edge.curve.curve);
      const curvePoints = oriented.reversed
        ? [...tessellated.points].reverse()
        : tessellated.points;
      curvePoints.forEach((point, index) => {
        if (points.length === 0) {
          points.push(point);
          return;
        }
        const last = points[points.length - 1];
        if (
          Math.abs(last.x - point.x) > EPSILON.DISTANCE ||
          Math.abs(last.y - point.y) > EPSILON.DISTANCE ||
          Math.abs(last.z - point.z) > EPSILON.DISTANCE ||
          index === curvePoints.length - 1
        ) {
          points.push(point);
        }
      });
    }
  });
  return points;
};

const tessellatePlaneFace = (
  face: BRepFace,
  loopsById: Map<string, BRepLoop>,
  edgesById: Map<string, BRepData["edges"][number]>,
  verticesById: Map<string, Vec3>
): RenderMesh | null => {
  if (face.surface.kind !== "plane") return null;
  const plane = face.surface.plane;
  const loopId = face.loops[0];
  if (!loopId) return null;
  const loop = loopsById.get(loopId);
  if (!loop) return null;
  const points = collectLoopPoints(loop, edgesById, verticesById);
  if (points.length < 3) return null;

  const contour = points.map((point) => {
    const projected = projectPointToPlane(point, plane);
    return { x: projected.u, y: projected.v };
  });

  const indices = triangulatePolygon(contour, []);
  if (indices.length === 0) return null;

  const positions: number[] = [];
  const uvs: number[] = [];
  contour.forEach((point) => {
    const world = unprojectPointFromPlane({ u: point.x, v: point.y }, plane);
    positions.push(world.x, world.y, world.z);
    uvs.push(point.x, point.y);
  });
  const normals = new Array(positions.length).fill(0);
  return { positions, normals, uvs, indices };
};

export const tessellateBRepToMesh = (brep: BRepData): RenderMesh => {
  const edgesById = new Map(brep.edges.map((edge) => [edge.id, edge]));
  const loopsById = new Map(brep.loops.map((loop) => [loop.id, loop]));
  const verticesById = new Map(brep.vertices.map((vertex) => [vertex.id, vertex.position]));
  const meshes: RenderMesh[] = [];

  brep.faces.forEach((face) => {
    if (face.surface.kind === "nurbs") {
      const tessellated = tessellateSurfaceAdaptive(face.surface.surface);
      meshes.push({
        positions: Array.from(tessellated.positions),
        normals: Array.from(tessellated.normals),
        indices: Array.from(tessellated.indices),
        uvs: Array.from(tessellated.uvs),
      });
      return;
    }
    const planeMesh = tessellatePlaneFace(face, loopsById, edgesById, verticesById);
    if (planeMesh) {
      meshes.push(planeMesh);
    }
  });

  if (meshes.length === 0) {
    return { positions: [], normals: [], uvs: [], indices: [] };
  }
  return mergeRenderMeshes(meshes);
};

export const brepFromMesh = (mesh: RenderMesh): BRepData => {
  const indices = ensureIndices(mesh);
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const vertices = Array.from({ length: vertexCount }, (_, index) => ({
    id: `v-${index}`,
    position: toVec3(mesh.positions, index),
  }));

  const edges: BRepData["edges"] = [];
  const loops: BRepData["loops"] = [];
  const faces: BRepData["faces"] = [];
  const edgeMap = new Map<string, string>();
  const edgeById = new Map<string, BRepData["edges"][number]>();
  const faceIds: string[] = [];

  const getEdgeId = (a: number, b: number) => {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const key = `${min}-${max}`;
    const existing = edgeMap.get(key);
    if (existing) return existing;
    const edgeId = `e-${edgeMap.size}`;
    edgeMap.set(key, edgeId);
    const edge: BRepEdge = {
      id: edgeId,
      curve: { kind: "line", start: vertices[min].position, end: vertices[max].position },
      vertices: [`v-${min}`, `v-${max}`] as [string, string],
    };
    edges.push(edge);
    edgeById.set(edgeId, edge);
    return edgeId;
  };

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i + 1];
    const c = indices[i + 2];
    const aPos = toVec3(mesh.positions, a);
    const bPos = toVec3(mesh.positions, b);
    const cPos = toVec3(mesh.positions, c);
    const normal = normalize(cross(
      { x: bPos.x - aPos.x, y: bPos.y - aPos.y, z: bPos.z - aPos.z },
      { x: cPos.x - aPos.x, y: cPos.y - aPos.y, z: cPos.z - aPos.z }
    ));
    const plane = buildPlaneFromNormal(aPos, normal);

    const loopId = `l-${loops.length}`;
    const edgeIds = [
      getEdgeId(a, b),
      getEdgeId(b, c),
      getEdgeId(c, a),
    ];
    const orientedEdges = edgeIds.map((edgeId, index) => {
      const edge = edgeById.get(edgeId);
      const [startIndex, endIndex] =
        index === 0 ? [a, b] : index === 1 ? [b, c] : [c, a];
      const startId = `v-${startIndex}`;
      const endId = `v-${endIndex}`;
      const reversed = edge ? edge.vertices[0] !== startId || edge.vertices[1] !== endId : false;
      return { edgeId, reversed };
    });
    loops.push({ id: loopId, edges: orientedEdges });

    const faceId = `f-${faces.length}`;
    faces.push({
      id: faceId,
      surface: { kind: "plane", plane },
      loops: [loopId],
    });
    faceIds.push(faceId);
  }

  return {
    vertices,
    edges,
    loops,
    faces,
    solids: faceIds.length ? [{ id: "solid-0", faces: faceIds }] : [],
  };
};

export const buildBRepGeometry = (
  id: string,
  brep: BRepData,
  mesh?: RenderMesh
): BRepGeometry => ({
  id,
  type: "brep",
  brep,
  mesh,
  layerId: "layer-default",
});

const createVertex = (id: string, position: Vec3) => ({ id, position });

export const createBRepBox = (
  width: number,
  height: number,
  depth: number,
  center: Vec3
): BRepData => {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const halfD = depth * 0.5;
  const base = [
    { x: -halfW, y: -halfH, z: -halfD },
    { x: halfW, y: -halfH, z: -halfD },
    { x: halfW, y: halfH, z: -halfD },
    { x: -halfW, y: halfH, z: -halfD },
    { x: -halfW, y: -halfH, z: halfD },
    { x: halfW, y: -halfH, z: halfD },
    { x: halfW, y: halfH, z: halfD },
    { x: -halfW, y: halfH, z: halfD },
  ];
  const vertices = base.map((point, index) =>
    createVertex(`v-${index}`, add(point, center))
  );

  const surfaces = createNurbsBoxSurfaces(width, height, depth).map((surface) => ({
    ...surface,
    controlPoints: surface.controlPoints.map((row) =>
      row.map((point) => add(point, center))
    ),
  }));

  const edges: BRepData["edges"] = [];
  const edgeMap = new Map<string, string>();
  const makeEdge = (a: number, b: number) => {
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    const existing = edgeMap.get(key);
    if (existing) return existing;
    const id = `e-${edgeMap.size}`;
    edgeMap.set(key, id);
    edges.push({
      id,
      curve: { kind: "line", start: vertices[a].position, end: vertices[b].position },
      vertices: [vertices[a].id, vertices[b].id],
    });
    return id;
  };

  const faceLoops = [
    [0, 1, 2, 3], // back
    [4, 5, 6, 7], // front
    [0, 4, 7, 3], // left
    [1, 5, 6, 2], // right
    [3, 2, 6, 7], // top
    [0, 1, 5, 4], // bottom
  ];

  const loops: BRepData["loops"] = [];
  const faces: BRepData["faces"] = [];
  faceLoops.forEach((loopVertices, index) => {
    const loopId = `l-${loops.length}`;
    const edgesForLoop = loopVertices.map((vertexId, edgeIndex) => {
      const nextIndex = loopVertices[(edgeIndex + 1) % loopVertices.length];
      const edgeId = makeEdge(vertexId, nextIndex);
      const edge = edges.find((entry) => entry.id === edgeId);
      const reversed =
        edge ? edge.vertices[0] !== vertices[vertexId].id || edge.vertices[1] !== vertices[nextIndex].id : false;
      return { edgeId, reversed };
    });
    loops.push({ id: loopId, edges: edgesForLoop });
    faces.push({
      id: `f-${faces.length}`,
      surface: { kind: "nurbs", surface: surfaces[index] },
      loops: [loopId],
    });
  });

  const solidFaces = faces.map((face) => face.id);
  return {
    vertices,
    edges,
    loops,
    faces,
    solids: [{ id: "solid-0", faces: solidFaces }],
  };
};

export const createBRepSphere = (radius: number, center: Vec3): BRepData => {
  const surface = createNurbsSphereSurface(radius);
  const translated = {
    ...surface,
    controlPoints: surface.controlPoints.map((row) =>
      row.map((point) => add(point, center))
    ),
  };
  return {
    vertices: [],
    edges: [],
    loops: [],
    faces: [
      {
        id: "f-0",
        surface: { kind: "nurbs", surface: translated },
        loops: [],
      },
    ],
    solids: [{ id: "solid-0", faces: ["f-0"] }],
  };
};

export const createBRepCylinder = (
  radius: number,
  height: number,
  center: Vec3
): BRepData => {
  const halfH = height * 0.5;
  const sideSurface = createNurbsCylinderSurface(radius, height);
  const translatedSide = {
    ...sideSurface,
    controlPoints: sideSurface.controlPoints.map((row) =>
      row.map((point) => add(point, { x: center.x, y: center.y - halfH, z: center.z }))
    ),
  };

  const topCenter = { x: center.x, y: center.y + halfH, z: center.z };
  const bottomCenter = { x: center.x, y: center.y - halfH, z: center.z };

  const topPlane = buildPlaneFromNormal(topCenter, { x: 0, y: 1, z: 0 });
  const bottomPlane = buildPlaneFromNormal(bottomCenter, { x: 0, y: -1, z: 0 });

  const topCircle = createCircleNurbs(topPlane, topCenter, radius);
  const bottomCircle = createCircleNurbs(bottomPlane, bottomCenter, radius);

  const vertices = [
    createVertex("v-top", add(topCenter, { x: radius, y: 0, z: 0 })),
    createVertex("v-bottom", add(bottomCenter, { x: radius, y: 0, z: 0 })),
  ];

  const edges: BRepData["edges"] = [
    {
      id: "e-top",
      curve: { kind: "nurbs", curve: topCircle },
      vertices: ["v-top", "v-top"],
    },
    {
      id: "e-bottom",
      curve: { kind: "nurbs", curve: bottomCircle },
      vertices: ["v-bottom", "v-bottom"],
    },
  ];

  const loops: BRepData["loops"] = [
    { id: "l-top", edges: [{ edgeId: "e-top" }] },
    { id: "l-bottom", edges: [{ edgeId: "e-bottom" }] },
  ];

  const faces: BRepData["faces"] = [
    { id: "f-side", surface: { kind: "nurbs", surface: translatedSide }, loops: [] },
    { id: "f-top", surface: { kind: "plane", plane: topPlane }, loops: ["l-top"] },
    { id: "f-bottom", surface: { kind: "plane", plane: bottomPlane }, loops: ["l-bottom"] },
  ];

  return {
    vertices,
    edges,
    loops,
    faces,
    solids: [{ id: "solid-0", faces: faces.map((face) => face.id) }],
  };
};
