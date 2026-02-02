import type { Vec3 } from "../types";

export type LineSegment = {
  start: Vec3;
  end: Vec3;
};

export type Intersection = {
  point: Vec3;
  t1: number;
  t2: number;
};

export function lineSegmentIntersection2D(
  seg1: LineSegment,
  seg2: LineSegment
): Intersection | null {
  const x1 = seg1.start.x;
  const y1 = seg1.start.y;
  const x2 = seg1.end.x;
  const y2 = seg1.end.y;
  const x3 = seg2.start.x;
  const y3 = seg2.start.y;
  const x4 = seg2.end.x;
  const y4 = seg2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < EPSILON.GEOMETRIC) {
    return null;
  }

  const t1 = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const t2 = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    const x = x1 + t1 * (x2 - x1);
    const y = y1 + t1 * (y2 - y1);
    return {
      point: { x, y, z: 0 },
      t1,
      t2,
    };
  }

  return null;
}

export function pointInPolygon2D(point: Vec3, polygon: Vec3[]): boolean {
  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function polygonArea2D(polygon: Vec3[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2;
}

export function isClockwise2D(polygon: Vec3[]): boolean {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    sum += (polygon[j].x - polygon[i].x) * (polygon[j].y + polygon[i].y);
  }
  return sum > 0;
}

export function reversePolyline(points: Vec3[]): Vec3[] {
  return [...points].reverse();
}

export function offsetPolyline2D(points: Vec3[], distance: number, closed: boolean = false): Vec3[] {
  if (points.length < 2) return [];

  const offsetPoints: Vec3[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const prev = i === 0 ? (closed ? points[n - 1] : points[0]) : points[i - 1];
    const curr = points[i];
    const next = i === n - 1 ? (closed ? points[0] : points[n - 1]) : points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const n1x = len1 > EPSILON.GEOMETRIC ? -v1y / len1 : 0;
    const n1y = len1 > EPSILON.GEOMETRIC ? v1x / len1 : 0;

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    const n2x = len2 > EPSILON.GEOMETRIC ? -v2y / len2 : 0;
    const n2y = len2 > EPSILON.GEOMETRIC ? v2x / len2 : 0;

    let nx = (n1x + n2x) / 2;
    let ny = (n1y + n2y) / 2;
    const nlen = Math.sqrt(nx * nx + ny * ny);

    if (nlen > EPSILON.GEOMETRIC) {
      nx /= nlen;
      ny /= nlen;
    } else {
      nx = n1x;
      ny = n1y;
    }

    const dot = n1x * n2x + n1y * n2y;
    const scale = dot > -0.999 ? 1.0 / Math.sqrt((1 + dot) / 2) : 1.0;

    offsetPoints.push({
      x: curr.x + nx * distance * scale,
      y: curr.y + ny * distance * scale,
      z: curr.z,
    });
  }

  return offsetPoints;
}

export function simplifyPolyline(points: Vec3[], tolerance: number = 0.1): Vec3[] {
  if (points.length <= 2) return points;

  function perpendicularDistance(point: Vec3, lineStart: Vec3, lineEnd: Vec3): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const dz = lineEnd.z - lineStart.z;
    const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (mag < EPSILON.GEOMETRIC) {
      const pdx = point.x - lineStart.x;
      const pdy = point.y - lineStart.y;
      const pdz = point.z - lineStart.z;
      return Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);
    }

    const u =
      ((point.x - lineStart.x) * dx +
        (point.y - lineStart.y) * dy +
        (point.z - lineStart.z) * dz) /
      (mag * mag);

    const closestX = lineStart.x + u * dx;
    const closestY = lineStart.y + u * dy;
    const closestZ = lineStart.z + u * dz;

    const distX = point.x - closestX;
    const distY = point.y - closestY;
    const distZ = point.z - closestZ;

    return Math.sqrt(distX * distX + distY * distY + distZ * distZ);
  }

  function douglasPeucker(points: Vec3[], tolerance: number): Vec3[] {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let index = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > tolerance) {
      const left = douglasPeucker(points.slice(0, index + 1), tolerance);
      const right = douglasPeucker(points.slice(index), tolerance);
      return [...left.slice(0, -1), ...right];
    } else {
      return [points[0], points[points.length - 1]];
    }
  }

  return douglasPeucker(points, tolerance);
}

export function intersectPolylines2D(poly1: Vec3[], poly2: Vec3[]): Vec3[] {
  const intersections: Vec3[] = [];

  for (let i = 0; i < poly1.length - 1; i++) {
    const seg1: LineSegment = {
      start: poly1[i],
      end: poly1[i + 1],
    };

    for (let j = 0; j < poly2.length - 1; j++) {
      const seg2: LineSegment = {
        start: poly2[j],
        end: poly2[j + 1],
      };

      const intersection = lineSegmentIntersection2D(seg1, seg2);
      if (intersection) {
        intersections.push(intersection.point);
      }
    }
  }

  return intersections;
}

export function mergeColinearSegments(points: Vec3[], angleTolerance: number = 0.01): Vec3[] {
  if (points.length <= 2) return points;

  const merged: Vec3[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = merged[merged.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v1z = curr.z - prev.z;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const v2z = next.z - curr.z;
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

    if (len1 < EPSILON.GEOMETRIC || len2 < EPSILON.GEOMETRIC) {
      continue;
    }

    const dot = (v1x * v2x + v1y * v2y + v1z * v2z) / (len1 * len2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle > angleTolerance) {
      merged.push(curr);
    }
  }

  merged.push(points[points.length - 1]);
  return merged;
}
