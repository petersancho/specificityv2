import type { Geometry, Vec3, WorkflowNodeData } from "../../types";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidVec3 = (point?: Vec3) =>
  Boolean(point) &&
  isFiniteNumber(point?.x) &&
  isFiniteNumber(point?.y) &&
  isFiniteNumber(point?.z);

const parsePointsText = (input?: string): Vec3[] => {
  if (!input) return [];
  const numbers = input
    .split(/[\s,]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (numbers.length < 2) return [];
  const groupSize = numbers.length % 3 === 0 ? 3 : 2;
  const points: Vec3[] = [];
  for (let i = 0; i + groupSize - 1 < numbers.length; i += groupSize) {
    if (groupSize === 3) {
      points.push({ x: numbers[i], y: numbers[i + 1], z: numbers[i + 2] });
    } else {
      points.push({ x: numbers[i], y: 0, z: numbers[i + 1] });
    }
  }
  return points;
};

export const isWorkflowNodeInvalid = (
  nodeType: string | undefined,
  data?: WorkflowNodeData,
  geometry?: Geometry[]
) => {
  if (!nodeType) return false;
  const safeData = data ?? { label: nodeType };

  switch (nodeType) {
    case "geometryReference": {
      const geometryId = safeData.geometryId;
      if (!geometryId) return true;
      if (!geometry) return false;
      return !geometry.some((item) => item.id === geometryId);
    }
    case "point":
      return !isValidVec3(safeData.point);
    case "polyline":
      return parsePointsText(safeData.pointsText).length < 2;
    case "surface":
      return parsePointsText(safeData.pointsText).length < 3;
    case "box": {
      const dims = safeData.boxDimensions;
      if (!dims) return true;
      return (
        !isFiniteNumber(dims.width) ||
        dims.width <= 0 ||
        !isFiniteNumber(dims.height) ||
        dims.height <= 0 ||
        !isFiniteNumber(dims.depth) ||
        dims.depth <= 0
      );
    }
    case "sphere": {
      const radius = safeData.sphereRadius;
      return !isFiniteNumber(radius) || radius <= 0;
    }
    default:
      return false;
  }
};
