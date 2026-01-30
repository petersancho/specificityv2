import type {
  ComponentSelection,
  Geometry,
  NURBSCurve,
  RenderMesh,
  Vec3,
  VertexGeometry,
} from "../types";
import { add, cross, dot, length, scale, sub } from "./math";
import { refineRayCurveIntersection } from "./nurbs";

export type Ray = { origin: Vec3; dir: Vec3 };

export type HitTestContext = {
  pointer: { x: number; y: number };
  rect: { width: number; height: number };
  viewProjection: Float32Array;
  ray: Ray;
};

export type PolylineRenderData = {
  points: Vec3[];
  parameters: number[];
  curve: NURBSCurve | null;
};

export type HitTestResult =
  | { kind: "object"; geometryId: string; depth: number; point: Vec3 | null }
  | { kind: "component"; selection: ComponentSelection; depth: number; point: Vec3 | null };

type ObjectHitTestArgs = {
  geometry: Geometry[];
  vertexMap: Map<string, VertexGeometry>;
  referencedVertexIds?: Set<string>;
  hidden?: Set<string>;
  locked?: Set<string>;
  context: HitTestContext;
  pickPixelThreshold?: number;
  pointPixelThreshold?: number;
  getSurfacePickMesh: (item: Geometry) => RenderMesh | null;
  getPolylineRenderData: (
    points: Vec3[],
    degree: 1 | 2 | 3,
    closed: boolean,
    nurbs?: NURBSCurve | null
  ) => PolylineRenderData;
  refineSurfaceIntersection?: (
    item: Geometry,
    mesh: RenderMesh,
    point: Vec3,
    vertexIndices: [number, number, number],
    ray: Ray
  ) => Vec3;
};

type ComponentHitTestArgs = {
  geometry: Geometry[];
  vertexMap: Map<string, VertexGeometry>;
  hidden?: Set<string>;
  locked?: Set<string>;
  context: HitTestContext;
  pickPixelThreshold?: number;
  pointPixelThreshold?: number;
  edgePixelThreshold?: number;
  mode?: "vertex" | "edge" | "face";
  getSurfacePickMesh: (item: Geometry) => RenderMesh | null;
  getPolylineRenderData: (
    points: Vec3[],
    degree: 1 | 2 | 3,
    closed: boolean,
    nurbs?: NURBSCurve | null
  ) => PolylineRenderData;
  refineSurfaceIntersection?: (
    item: Geometry,
    mesh: RenderMesh,
    point: Vec3,
    vertexIndices: [number, number, number],
    ray: Ray
  ) => Vec3;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const projectPointToScreen = (
  point: Vec3,
  viewProjection: Float32Array,
  rect: { width: number; height: number }
) => {
  const x = point.x;
  const y = point.y;
  const z = point.z;
  const clipX =
    viewProjection[0] * x +
    viewProjection[4] * y +
    viewProjection[8] * z +
    viewProjection[12];
  const clipY =
    viewProjection[1] * x +
    viewProjection[5] * y +
    viewProjection[9] * z +
    viewProjection[13];
  const clipZ =
    viewProjection[2] * x +
    viewProjection[6] * y +
    viewProjection[10] * z +
    viewProjection[14];
  const clipW =
    viewProjection[3] * x +
    viewProjection[7] * y +
    viewProjection[11] * z +
    viewProjection[15];
  if (!Number.isFinite(clipW) || clipW <= 1e-6) return null;
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  const depth = clipZ / clipW;
  const screenX = (ndcX * 0.5 + 0.5) * rect.width;
  const screenY = (1 - (ndcY * 0.5 + 0.5)) * rect.height;
  if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
  return { x: screenX, y: screenY, depth };
};

const distancePointToSegment2d = (
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const denom = abx * abx + aby * aby;
  if (denom <= 1e-12) {
    const dx = point.x - a.x;
    const dy = point.y - a.y;
    return Math.hypot(dx, dy);
  }
  const t = clamp(((point.x - a.x) * abx + (point.y - a.y) * aby) / denom, 0, 1);
  const px = a.x + abx * t;
  const py = a.y + aby * t;
  return Math.hypot(point.x - px, point.y - py);
};

const distancePointToSegment3d = (point: Vec3, a: Vec3, b: Vec3) => {
  const ab = sub(b, a);
  const ap = sub(point, a);
  const denom = dot(ab, ab);
  if (denom <= 1e-12) {
    return length(ap);
  }
  const t = clamp(dot(ap, ab) / denom, 0, 1);
  const closest = add(a, scale(ab, t));
  return length(sub(point, closest));
};

const closestPointsRaySegment = (ray: Ray, a: Vec3, b: Vec3) => {
  const d1 = ray.dir;
  const d2 = sub(b, a);
  const r = sub(ray.origin, a);
  const a0 = dot(d1, d1);
  const b0 = dot(d1, d2);
  const c0 = dot(d2, d2);
  const d0 = dot(d1, r);
  const e0 = dot(d2, r);
  const denom = a0 * c0 - b0 * b0;

  let t = 0;
  let s = 0;
  if (Math.abs(denom) > 1e-10) {
    t = (b0 * e0 - c0 * d0) / denom;
    s = (a0 * e0 - b0 * d0) / denom;
  } else {
    t = 0;
    s = c0 > 1e-12 ? e0 / c0 : 0;
  }

  if (t < 0) {
    t = 0;
    s = c0 > 1e-12 ? clamp(e0 / c0, 0, 1) : 0;
  }

  if (s < 0 || s > 1) {
    s = clamp(s, 0, 1);
    const segPoint = add(a, scale(d2, s));
    t = a0 > 1e-12 ? dot(sub(segPoint, ray.origin), d1) / a0 : 0;
    if (t < 0) t = 0;
  }

  const rayPoint = add(ray.origin, scale(d1, t));
  const segPoint = add(a, scale(d2, s));
  return {
    tRay: t,
    tSeg: s,
    rayPoint,
    segPoint,
    distance: length(sub(rayPoint, segPoint)),
  };
};

const intersectRayTriangle = (ray: Ray, a: Vec3, b: Vec3, c: Vec3) => {
  const EPS = 1e-7;
  const edge1 = sub(b, a);
  const edge2 = sub(c, a);
  const pvec = cross(ray.dir, edge2);
  const det = dot(edge1, pvec);
  if (Math.abs(det) < EPS) return null;
  const invDet = 1 / det;
  const tvec = sub(ray.origin, a);
  const u = dot(tvec, pvec) * invDet;
  if (u < 0 || u > 1) return null;
  const qvec = cross(tvec, edge1);
  const v = dot(ray.dir, qvec) * invDet;
  if (v < 0 || u + v > 1) return null;
  const t = dot(edge2, qvec) * invDet;
  if (t < 0) return null;
  return { t, point: add(ray.origin, scale(ray.dir, t)) };
};

const getMeshPoint = (mesh: RenderMesh, index: number): Vec3 => ({
  x: mesh.positions[index * 3] ?? 0,
  y: mesh.positions[index * 3 + 1] ?? 0,
  z: mesh.positions[index * 3 + 2] ?? 0,
});

export const hitTestObject = ({
  geometry,
  vertexMap,
  referencedVertexIds,
  hidden,
  locked,
  context,
  pickPixelThreshold = 16,
  pointPixelThreshold,
  getSurfacePickMesh,
  getPolylineRenderData,
  refineSurfaceIntersection,
}: ObjectHitTestArgs): HitTestResult | null => {
  const hiddenSet = hidden ?? new Set();
  const lockedSet = locked ?? new Set();
  const refSet = referencedVertexIds ?? new Set();
  const pointer = context.pointer;
  const rect = context.rect;
  const viewProjection = context.viewProjection;
  let best: HitTestResult | null = null;
  let bestDepth = Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;
  const depthEpsilon = 1e-6;
  const pointThreshold = pointPixelThreshold ?? pickPixelThreshold;

  const consider = (
    geometryId: string,
    depth: number,
    point: Vec3 | null,
    distance = Number.POSITIVE_INFINITY
  ) => {
    if (!Number.isFinite(depth)) return;
    if (
      depth < bestDepth - depthEpsilon ||
      (Math.abs(depth - bestDepth) <= depthEpsilon && distance < bestDistance)
    ) {
      bestDepth = depth;
      bestDistance = distance;
      best = { kind: "object", geometryId, depth, point };
    }
  };

  geometry.forEach((item) => {
    if (hiddenSet.has(item.id) || lockedSet.has(item.id)) return;
    if (item.type === "vertex" && refSet.has(item.id)) return;

    if (item.type === "vertex") {
      const screen = projectPointToScreen(item.position, viewProjection, rect);
      if (!screen) return;
      const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
      if (distance <= pointThreshold) {
        consider(item.id, screen.depth, item.position, distance);
      }
      return;
    }

    if (item.type === "polyline") {
      const points = item.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[];
      if (points.length < 2) return;
      const renderData = getPolylineRenderData(points, item.degree, item.closed, item.nurbs);
      const edgePoints = renderData.points;
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestDepthLocal = Number.POSITIVE_INFINITY;
      let bestIndex = -1;
      for (let i = 0; i < edgePoints.length - 1; i += 1) {
        const a = projectPointToScreen(edgePoints[i], viewProjection, rect);
        const b = projectPointToScreen(edgePoints[i + 1], viewProjection, rect);
        if (!a || !b) continue;
        const distance = distancePointToSegment2d(pointer, a, b);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestDepthLocal = Math.min(a.depth, b.depth);
          bestIndex = i;
        }
      }
      if (bestDistance <= pickPixelThreshold && bestIndex >= 0) {
        const a = edgePoints[bestIndex];
        const b = edgePoints[bestIndex + 1];
        const closest = closestPointsRaySegment(context.ray, a, b);
        let pickPoint = closest.segPoint;
        let pickDepth = bestDepthLocal;

        if (renderData.curve && renderData.parameters.length > bestIndex + 1) {
          const u0 = renderData.parameters[bestIndex];
          const u1 = renderData.parameters[bestIndex + 1];
          const initialU = u0 + (u1 - u0) * clamp(closest.tSeg, 0, 1);
          const refined = refineRayCurveIntersection(
            renderData.curve,
            { origin: context.ray.origin, direction: context.ray.dir },
            initialU,
            { maxIterations: 8, tolerance: 1e-5 }
          );
          pickPoint = refined.point;
        }

        const screen = projectPointToScreen(pickPoint, viewProjection, rect);
        if (screen) {
          pickDepth = screen.depth;
        }
        consider(item.id, pickDepth, pickPoint);
      }
      return;
    }

    if (item.type === "nurbsCurve") {
      const points = item.nurbs.controlPoints;
      if (points.length < 2) return;
      const renderData = getPolylineRenderData(points, item.nurbs.degree as 1 | 2 | 3, item.closed ?? false, item.nurbs);
      const edgePoints = renderData.points;
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestDepthLocal = Number.POSITIVE_INFINITY;
      let bestIndex = -1;
      for (let i = 0; i < edgePoints.length - 1; i += 1) {
        const a = projectPointToScreen(edgePoints[i], viewProjection, rect);
        const b = projectPointToScreen(edgePoints[i + 1], viewProjection, rect);
        if (!a || !b) continue;
        const distance = distancePointToSegment2d(pointer, a, b);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestDepthLocal = Math.min(a.depth, b.depth);
          bestIndex = i;
        }
      }
      if (bestDistance <= pickPixelThreshold && bestIndex >= 0) {
        const a = edgePoints[bestIndex];
        const b = edgePoints[bestIndex + 1];
        const closest = closestPointsRaySegment(context.ray, a, b);
        let pickPoint = closest.segPoint;
        let pickDepth = bestDepthLocal;

        if (renderData.curve && renderData.parameters.length > bestIndex + 1) {
          const u0 = renderData.parameters[bestIndex];
          const u1 = renderData.parameters[bestIndex + 1];
          const initialU = u0 + (u1 - u0) * clamp(closest.tSeg, 0, 1);
          const refined = refineRayCurveIntersection(
            renderData.curve,
            { origin: context.ray.origin, direction: context.ray.dir },
            initialU,
            { maxIterations: 8, tolerance: 1e-5 }
          );
          pickPoint = refined.point;
        }

        const screen = projectPointToScreen(pickPoint, viewProjection, rect);
        if (screen) {
          pickDepth = screen.depth;
        }
        consider(item.id, pickDepth, pickPoint);
      }
      return;
    }

    const mesh = getSurfacePickMesh(item);
    if (!mesh) return;
    const indices = mesh.indices;
    let nearestT = Number.POSITIVE_INFINITY;
    let nearestPoint: Vec3 | null = null;
    let nearestTriangle: [number, number, number] | null = null;

    const triangleCount =
      indices.length >= 3 ? Math.floor(indices.length / 3) : Math.floor(mesh.positions.length / 9);

    for (let faceIndex = 0; faceIndex < triangleCount; faceIndex += 1) {
      const baseIndex = faceIndex * 3;
      const i0 = indices.length >= baseIndex + 3 ? indices[baseIndex] : baseIndex;
      const i1 = indices.length >= baseIndex + 3 ? indices[baseIndex + 1] : baseIndex + 1;
      const i2 = indices.length >= baseIndex + 3 ? indices[baseIndex + 2] : baseIndex + 2;
      const a = getMeshPoint(mesh, i0);
      const b = getMeshPoint(mesh, i1);
      const c = getMeshPoint(mesh, i2);
      const intersection = intersectRayTriangle(context.ray, a, b, c);
      if (!intersection) continue;
      if (intersection.t < nearestT) {
        nearestT = intersection.t;
        nearestPoint = intersection.point;
        nearestTriangle = [i0, i1, i2];
      }
    }

    if (!nearestPoint) return;
    if (nearestTriangle && refineSurfaceIntersection) {
      const refined = refineSurfaceIntersection(
        item,
        mesh,
        nearestPoint,
        nearestTriangle,
        context.ray
      );
      nearestPoint = refined;
      const refinedT = dot(sub(refined, context.ray.origin), context.ray.dir);
      if (Number.isFinite(refinedT)) {
        nearestT = refinedT;
      }
    }
    const screen = projectPointToScreen(nearestPoint, viewProjection, rect);
    consider(item.id, screen?.depth ?? nearestT, nearestPoint);
  });

  return best;
};

export const hitTestComponent = ({
  geometry,
  vertexMap,
  hidden,
  locked,
  context,
  pickPixelThreshold = 16,
  pointPixelThreshold,
  edgePixelThreshold = 12,
  mode,
  getSurfacePickMesh,
  getPolylineRenderData,
  refineSurfaceIntersection,
}: ComponentHitTestArgs): HitTestResult | null => {
  const hiddenSet = hidden ?? new Set();
  const lockedSet = locked ?? new Set();
  const pointer = context.pointer;
  const rect = context.rect;
  const viewProjection = context.viewProjection;
  let best: HitTestResult | null = null;
  let bestDepth = Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;
  const depthEpsilon = 1e-6;
  const pointThreshold = pointPixelThreshold ?? pickPixelThreshold;

  const consider = (
    selection: ComponentSelection,
    depth: number,
    point: Vec3 | null,
    distance = Number.POSITIVE_INFINITY
  ) => {
    if (!Number.isFinite(depth)) return;
    if (
      depth < bestDepth - depthEpsilon ||
      (Math.abs(depth - bestDepth) <= depthEpsilon && distance < bestDistance)
    ) {
      bestDepth = depth;
      bestDistance = distance;
      best = { kind: "component", selection, depth, point };
    }
  };

  geometry.forEach((item) => {
    if (hiddenSet.has(item.id) || lockedSet.has(item.id)) return;

    if (item.type === "vertex") {
      if (mode !== "vertex") return;
      const screen = projectPointToScreen(item.position, viewProjection, rect);
      if (!screen) return;
      const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
      if (distance <= pointThreshold) {
        consider(
          {
            kind: "vertex",
            geometryId: item.id,
            vertexId: item.id,
          },
          screen.depth,
          item.position,
          distance
        );
      }
      return;
    }

    if (item.type === "polyline") {
      const points = item.vertexIds
        .map((id) => vertexMap.get(id)?.position)
        .filter(Boolean) as Vec3[];
      if (points.length < 2) return;
      if (mode === "vertex") {
        item.vertexIds.forEach((vertexId) => {
          const vertex = vertexMap.get(vertexId);
          if (!vertex) return;
          const screen = projectPointToScreen(vertex.position, viewProjection, rect);
          if (!screen) return;
          const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
          if (distance <= pointThreshold) {
            consider(
              {
                kind: "vertex",
                geometryId: item.id,
                vertexId,
              },
              screen.depth,
              vertex.position,
              distance
            );
          }
        });
        return;
      }
      const renderData = getPolylineRenderData(points, item.degree, item.closed, item.nurbs);
      const edgePoints = renderData.points;
      const controlEdgePoints = item.closed ? [...points, points[0]] : points;
      const edgeVertexIds = item.closed
        ? [...item.vertexIds, item.vertexIds[0]]
        : item.vertexIds;
      let closestIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestDepthLocal = Number.POSITIVE_INFINITY;
      for (let i = 0; i < edgePoints.length - 1; i += 1) {
        const aScreen = projectPointToScreen(edgePoints[i], viewProjection, rect);
        const bScreen = projectPointToScreen(edgePoints[i + 1], viewProjection, rect);
        if (!aScreen || !bScreen) continue;
        const distance = distancePointToSegment2d(pointer, aScreen, bScreen);
        if (distance < bestDistance) {
          bestDistance = distance;
          closestIndex = i;
          bestDepthLocal = Math.min(aScreen.depth, bScreen.depth);
        }
      }
      if (closestIndex >= 0 && bestDistance <= pickPixelThreshold) {
        const a = edgePoints[closestIndex];
        const b = edgePoints[closestIndex + 1];
        const closest = closestPointsRaySegment(context.ray, a, b);
        let pickPoint = closest.segPoint;
        let pickDepth = bestDepthLocal;

        if (renderData.curve && renderData.parameters.length > closestIndex + 1) {
          const u0 = renderData.parameters[closestIndex];
          const u1 = renderData.parameters[closestIndex + 1];
          const initialU = u0 + (u1 - u0) * clamp(closest.tSeg, 0, 1);
          const refined = refineRayCurveIntersection(
            renderData.curve,
            { origin: context.ray.origin, direction: context.ray.dir },
            initialU,
            { maxIterations: 8, tolerance: 1e-5 }
          );
          pickPoint = refined.point;
        }

        const screen = projectPointToScreen(pickPoint, viewProjection, rect);
        if (screen) {
          pickDepth = screen.depth;
        }

        let controlIndex = closestIndex;
        if (item.degree > 1 && controlEdgePoints.length > 1) {
          let bestControlDistance = Number.POSITIVE_INFINITY;
          for (let i = 0; i < controlEdgePoints.length - 1; i += 1) {
            const dist = distancePointToSegment3d(
              pickPoint,
              controlEdgePoints[i],
              controlEdgePoints[i + 1]
            );
            if (dist < bestControlDistance) {
              bestControlDistance = dist;
              controlIndex = i;
            }
          }
        }
        consider(
          {
            kind: "edge",
            geometryId: item.id,
            edgeIndex: controlIndex,
            vertexIds: [edgeVertexIds[controlIndex], edgeVertexIds[controlIndex + 1]],
          },
          pickDepth,
          pickPoint
        );
      }
      return;
    }

    if (item.type === "nurbsCurve") {
      const controlPoints = item.nurbs.controlPoints;
      if (controlPoints.length < 2) return;

      // Vertex mode: pick control points
      if (mode === "vertex") {
        controlPoints.forEach((cp, index) => {
          const screen = projectPointToScreen(cp, viewProjection, rect);
          if (!screen) return;
          const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
          if (distance <= pointThreshold) {
            consider(
              {
                kind: "vertex",
                geometryId: item.id,
                vertexIndex: index,
              },
              screen.depth,
              cp,
              distance
            );
          }
        });
        return;
      }

      // Edge mode: pick curve segments (existing behavior)
      const renderData = getPolylineRenderData(controlPoints, item.nurbs.degree as 1 | 2 | 3, item.closed ?? false, item.nurbs);
      const edgePoints = renderData.points;
      let bestDistance = Number.POSITIVE_INFINITY;
      let bestDepthLocal = Number.POSITIVE_INFINITY;
      let bestIndex = -1;
      for (let i = 0; i < edgePoints.length - 1; i += 1) {
        const a = projectPointToScreen(edgePoints[i], viewProjection, rect);
        const b = projectPointToScreen(edgePoints[i + 1], viewProjection, rect);
        if (!a || !b) continue;
        const distance = distancePointToSegment2d(pointer, a, b);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestDepthLocal = Math.min(a.depth, b.depth);
          bestIndex = i;
        }
      }
      if (bestDistance <= edgePixelThreshold && bestIndex >= 0) {
        const a = edgePoints[bestIndex];
        const b = edgePoints[bestIndex + 1];
        const closest = closestPointsRaySegment(context.ray, a, b);
        let pickPoint = closest.segPoint;
        let pickDepth = bestDepthLocal;

        if (renderData.curve && renderData.parameters.length > bestIndex + 1) {
          const u0 = renderData.parameters[bestIndex];
          const u1 = renderData.parameters[bestIndex + 1];
          const initialU = u0 + (u1 - u0) * clamp(closest.tSeg, 0, 1);
          const refined = refineRayCurveIntersection(
            renderData.curve,
            { origin: context.ray.origin, direction: context.ray.dir },
            initialU,
            { maxIterations: 8, tolerance: 1e-5 }
          );
          pickPoint = refined.point;
        }

        const screen = projectPointToScreen(pickPoint, viewProjection, rect);
        if (screen) {
          pickDepth = screen.depth;
        }
        // For edge selection, also populate vertexIndices for control polygon segment
        const controlEdgeCount = item.closed ? controlPoints.length : controlPoints.length - 1;
        let controlIndex = bestIndex;
        if (item.nurbs.degree > 1 && controlEdgeCount > 0) {
          let bestControlDist = Number.POSITIVE_INFINITY;
          for (let i = 0; i < controlEdgeCount; i += 1) {
            const cpA = controlPoints[i];
            const cpB = controlPoints[(i + 1) % controlPoints.length];
            const dist = distancePointToSegment3d(pickPoint, cpA, cpB);
            if (dist < bestControlDist) {
              bestControlDist = dist;
              controlIndex = i;
            }
          }
        }
        const nextIndex = (controlIndex + 1) % controlPoints.length;
        const selection: ComponentSelection = {
          kind: "edge",
          geometryId: item.id,
          edgeIndex: controlIndex,
          vertexIndices: [controlIndex, nextIndex],
        };
        consider(selection, pickDepth, pickPoint);
      }
      return;
    }

    // Handle nurbsSurface vertex picking
    if (item.type === "nurbsSurface" && mode === "vertex") {
      const controlGrid = item.nurbs.controlPoints;
      const uCount = controlGrid.length;
      if (uCount === 0) return;
      const vCount = controlGrid[0]?.length ?? 0;
      if (vCount === 0) return;

      for (let u = 0; u < uCount; u += 1) {
        for (let v = 0; v < vCount; v += 1) {
          const cp = controlGrid[u][v];
          const screen = projectPointToScreen(cp, viewProjection, rect);
          if (!screen) continue;
          const distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y);
          if (distance <= pointThreshold) {
            // Flattened index: u * vCount + v
            const flatIndex = u * vCount + v;
            consider(
              {
                kind: "vertex",
                geometryId: item.id,
                vertexIndex: flatIndex,
              },
              screen.depth,
              cp,
              distance
            );
          }
        }
      }
      return;
    }

    const mesh = getSurfacePickMesh(item);
    if (!mesh) return;
    const indices = mesh.indices;
    const triangleCount =
      indices.length >= 3 ? Math.floor(indices.length / 3) : Math.floor(mesh.positions.length / 9);

    let bestFaceIndex = -1;
    let bestIntersection:
      | { t: number; point: Vec3; vertexIndices: [number, number, number] }
      | null = null;

    for (let faceIndex = 0; faceIndex < triangleCount; faceIndex += 1) {
      const baseIndex = faceIndex * 3;
      const i0 = indices.length >= baseIndex + 3 ? indices[baseIndex] : baseIndex;
      const i1 = indices.length >= baseIndex + 3 ? indices[baseIndex + 1] : baseIndex + 1;
      const i2 = indices.length >= baseIndex + 3 ? indices[baseIndex + 2] : baseIndex + 2;
      const a = getMeshPoint(mesh, i0);
      const b = getMeshPoint(mesh, i1);
      const c = getMeshPoint(mesh, i2);
      const intersection = intersectRayTriangle(context.ray, a, b, c);
      if (!intersection) continue;
      if (!bestIntersection || intersection.t < bestIntersection.t) {
        bestFaceIndex = faceIndex;
        bestIntersection = { t: intersection.t, point: intersection.point, vertexIndices: [i0, i1, i2] };
      }
    }

    if (!bestIntersection) return;
    if (refineSurfaceIntersection) {
      const refinedPoint = refineSurfaceIntersection(
        item,
        mesh,
        bestIntersection.point,
        bestIntersection.vertexIndices,
        context.ray
      );
      bestIntersection = {
        ...bestIntersection,
        point: refinedPoint,
      };
    }
    const [i0, i1, i2] = bestIntersection.vertexIndices;
    const a = getMeshPoint(mesh, i0);
    const b = getMeshPoint(mesh, i1);
    const c = getMeshPoint(mesh, i2);
    const aScreen = projectPointToScreen(a, viewProjection, rect);
    const bScreen = projectPointToScreen(b, viewProjection, rect);
    const cScreen = projectPointToScreen(c, viewProjection, rect);
    const screenPoint = projectPointToScreen(bestIntersection.point, viewProjection, rect);
    const depth = screenPoint?.depth ?? bestIntersection.t;

    if (mode === "vertex") {
      if (!aScreen || !bScreen || !cScreen) return;
      const vertexCandidates = [
        { index: i0, screen: aScreen, point: a },
        { index: i1, screen: bScreen, point: b },
        { index: i2, screen: cScreen, point: c },
      ];
      vertexCandidates.sort(
        (lhs, rhs) =>
          Math.hypot(pointer.x - lhs.screen.x, pointer.y - lhs.screen.y) -
          Math.hypot(pointer.x - rhs.screen.x, pointer.y - rhs.screen.y)
      );
      const candidate = vertexCandidates[0];
      const distance = Math.hypot(pointer.x - candidate.screen.x, pointer.y - candidate.screen.y);
      if (distance > pointThreshold) return;
      consider(
        {
          kind: "vertex",
          geometryId: item.id,
          vertexIndex: candidate.index,
        },
        candidate.screen.depth,
        candidate.point,
        distance
      );
      return;
    }

    if (mode === "edge" || mode === undefined) {
      if (aScreen && bScreen && cScreen) {
        const edges = [
          {
            edge: [i0, i1] as [number, number],
            distance: distancePointToSegment2d(pointer, aScreen, bScreen),
            localIndex: 0,
          },
          {
            edge: [i1, i2] as [number, number],
            distance: distancePointToSegment2d(pointer, bScreen, cScreen),
            localIndex: 1,
          },
          {
            edge: [i2, i0] as [number, number],
            distance: distancePointToSegment2d(pointer, cScreen, aScreen),
            localIndex: 2,
          },
        ];
        edges.sort((lhs, rhs) => lhs.distance - rhs.distance);
        const closest = edges[0];
        if (closest.distance <= edgePixelThreshold) {
          consider(
            {
              kind: "edge",
              geometryId: item.id,
              edgeIndex: bestFaceIndex * 3 + closest.localIndex,
              vertexIndices: [closest.edge[0], closest.edge[1]],
            },
            depth,
            bestIntersection.point
          );
          return;
        }
      }
      if (mode === "edge") return;
    }

    if (mode === "face" || mode === undefined) {
      consider(
        {
          kind: "face",
          geometryId: item.id,
          faceIndex: bestFaceIndex,
          vertexIndices: [i0, i1, i2],
        },
        depth,
        bestIntersection.point
      );
    }
  });

  return best;
};
