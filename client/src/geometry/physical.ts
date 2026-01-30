import type { InertiaTensor, MeshPrimitiveInfo, RenderMesh, Vec3 } from "../types";
import { computeMeshArea } from "./mesh";

const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});

const scale = (v: Vec3, factor: number): Vec3 => ({
  x: v.x * factor,
  y: v.y * factor,
  z: v.z * factor,
});

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const computeMeshVolumeAndCentroid = (mesh: RenderMesh) => {
  const { positions, indices } = mesh;
  if (positions.length < 9 || indices.length < 3) {
    return { volume_m3: 0, centroid: null as Vec3 | null };
  }

  let totalVolume = 0;
  let centroidSum: Vec3 = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const a: Vec3 = { x: positions[ia], y: positions[ia + 1], z: positions[ia + 2] };
    const b: Vec3 = { x: positions[ib], y: positions[ib + 1], z: positions[ib + 2] };
    const c: Vec3 = { x: positions[ic], y: positions[ic + 1], z: positions[ic + 2] };

    const volume = dot(a, cross(b, c)) / 6;
    totalVolume += volume;
    const tetraCentroid = scale(add(add(a, b), c), 1 / 4);
    centroidSum = add(centroidSum, scale(tetraCentroid, volume));
  }

  if (Math.abs(totalVolume) < 1e-9) {
    return { volume_m3: 0, centroid: null as Vec3 | null };
  }

  const centroid = scale(centroidSum, 1 / totalVolume);
  return { volume_m3: Math.abs(totalVolume), centroid };
};

const computeBoxInertia = (mass: number, width: number, height: number, depth: number): InertiaTensor => ({
  xx: (mass * (height * height + depth * depth)) / 12,
  yy: (mass * (width * width + depth * depth)) / 12,
  zz: (mass * (width * width + height * height)) / 12,
  xy: 0,
  xz: 0,
  yz: 0,
});

const computeSphereInertia = (mass: number, radius: number): InertiaTensor => {
  const inertia = (2 / 5) * mass * radius * radius;
  return { xx: inertia, yy: inertia, zz: inertia, xy: 0, xz: 0, yz: 0 };
};

const computeCylinderInertia = (mass: number, radius: number, height: number): InertiaTensor => ({
  xx: (mass * (3 * radius * radius + height * height)) / 12,
  yy: (mass * radius * radius) / 2,
  zz: (mass * (3 * radius * radius + height * height)) / 12,
  xy: 0,
  xz: 0,
  yz: 0,
});

const computeHollowCylinderInertia = (
  mass: number,
  outerRadius: number,
  innerRadius: number,
  height: number
): InertiaTensor => {
  const r2 = outerRadius * outerRadius + innerRadius * innerRadius;
  return {
    xx: (mass * (3 * r2 + height * height)) / 12,
    yy: (mass * r2) / 2,
    zz: (mass * (3 * r2 + height * height)) / 12,
    xy: 0,
    xz: 0,
    yz: 0,
  };
};

const computeEllipsoidInertia = (
  mass: number,
  radiusX: number,
  radiusY: number,
  radiusZ: number
): InertiaTensor => ({
  xx: (mass * (radiusY * radiusY + radiusZ * radiusZ)) / 5,
  yy: (mass * (radiusX * radiusX + radiusZ * radiusZ)) / 5,
  zz: (mass * (radiusX * radiusX + radiusY * radiusY)) / 5,
  xy: 0,
  xz: 0,
  yz: 0,
});

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const readPrimitiveParam = (primitive: MeshPrimitiveInfo, key: string) => {
  const direct = (primitive as Record<string, unknown>)[key];
  if (isFiniteNumber(direct)) return direct;
  const params = primitive.params;
  if (params && isFiniteNumber(params[key])) return params[key] as number;
  return undefined;
};

type AnalyticPrimitiveMetrics = {
  area_m2?: number;
  volume_m3?: number;
  inertia?: (mass: number) => InertiaTensor;
};

const computeAnalyticPrimitiveMetrics = (primitive: MeshPrimitiveInfo): AnalyticPrimitiveMetrics => {
  const size = readPrimitiveParam(primitive, "size");
  const radius = readPrimitiveParam(primitive, "radius");
  const height = readPrimitiveParam(primitive, "height");
  const tube = readPrimitiveParam(primitive, "tube");
  const innerRadius = readPrimitiveParam(primitive, "innerRadius");
  const topRadius = readPrimitiveParam(primitive, "topRadius");
  const capHeight = readPrimitiveParam(primitive, "capHeight");

  switch (primitive.kind) {
    case "box": {
      const width = primitive.dimensions?.width ?? size;
      const heightVal = primitive.dimensions?.height ?? size;
      const depth = primitive.dimensions?.depth ?? size;
      if (!isFiniteNumber(width) || !isFiniteNumber(heightVal) || !isFiniteNumber(depth)) {
        return {};
      }
      const area_m2 = 2 * (width * heightVal + width * depth + heightVal * depth);
      const volume_m3 = width * heightVal * depth;
      return {
        area_m2,
        volume_m3,
        inertia: (mass) => computeBoxInertia(mass, width, heightVal, depth),
      };
    }
    case "sphere": {
      if (!isFiniteNumber(radius)) return {};
      const area_m2 = 4 * Math.PI * radius * radius;
      const volume_m3 = (4 / 3) * Math.PI * Math.pow(radius, 3);
      return {
        area_m2,
        volume_m3,
        inertia: (mass) => computeSphereInertia(mass, radius),
      };
    }
    case "cylinder": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(height)) return {};
      const area_m2 = 2 * Math.PI * radius * (radius + height);
      const volume_m3 = Math.PI * radius * radius * height;
      return {
        area_m2,
        volume_m3,
        inertia: (mass) => computeCylinderInertia(mass, radius, height),
      };
    }
    case "pipe": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(innerRadius) || !isFiniteNumber(height)) {
        return {};
      }
      const clampedInner = Math.min(innerRadius, radius * 0.9);
      const volume_m3 = Math.PI * (radius * radius - clampedInner * clampedInner) * height;
      const area_m2 =
        2 * Math.PI * radius * height +
        2 * Math.PI * clampedInner * height +
        2 * Math.PI * (radius * radius - clampedInner * clampedInner);
      return {
        area_m2,
        volume_m3,
        inertia: (mass) => computeHollowCylinderInertia(mass, radius, clampedInner, height),
      };
    }
    case "torus": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(tube)) return {};
      const area_m2 = 4 * Math.PI * Math.PI * radius * tube;
      const volume_m3 = 2 * Math.PI * Math.PI * radius * tube * tube;
      return { area_m2, volume_m3 };
    }
    case "capsule": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(height)) return {};
      const cylinderLength = Math.max(0, height - radius * 2);
      const area_m2 = 4 * Math.PI * radius * radius + 2 * Math.PI * radius * cylinderLength;
      const volume_m3 =
        (4 / 3) * Math.PI * Math.pow(radius, 3) + Math.PI * radius * radius * cylinderLength;
      return { area_m2, volume_m3 };
    }
    case "hemisphere": {
      if (!isFiniteNumber(radius)) return {};
      const area_m2 = 2 * Math.PI * radius * radius;
      return { area_m2 };
    }
    case "sphericalCap": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(capHeight)) return {};
      const clampedHeight = Math.max(0, Math.min(capHeight, radius * 2));
      const area_m2 = 2 * Math.PI * radius * clampedHeight;
      return { area_m2 };
    }
    case "disk": {
      if (!isFiniteNumber(radius)) return {};
      return { area_m2: Math.PI * radius * radius };
    }
    case "ring": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(innerRadius)) return {};
      const clampedInner = Math.min(innerRadius, radius * 0.95);
      return { area_m2: Math.PI * (radius * radius - clampedInner * clampedInner) };
    }
    case "pyramid": {
      if (!isFiniteNumber(size) || !isFiniteNumber(height)) return {};
      const baseArea = size * size;
      const slantHeight = Math.sqrt(Math.pow(size * 0.5, 2) + height * height);
      const area_m2 = baseArea + 2 * size * slantHeight;
      const volume_m3 = (1 / 3) * baseArea * height;
      return { area_m2, volume_m3 };
    }
    case "frustum": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(topRadius) || !isFiniteNumber(height)) {
        return {};
      }
      const slantHeight = Math.sqrt(Math.pow(radius - topRadius, 2) + height * height);
      const area_m2 =
        Math.PI * (radius * radius + topRadius * topRadius) +
        Math.PI * (radius + topRadius) * slantHeight;
      const volume_m3 =
        (Math.PI * height * (radius * radius + radius * topRadius + topRadius * topRadius)) / 3;
      return { area_m2, volume_m3 };
    }
    case "triangularPrism":
    case "pentagonalPrism":
    case "hexagonalPrism": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(height)) return {};
      const sides = primitive.kind === "triangularPrism" ? 3 : primitive.kind === "pentagonalPrism" ? 5 : 6;
      const baseArea = 0.5 * sides * radius * radius * Math.sin((2 * Math.PI) / sides);
      const perimeter = 2 * sides * radius * Math.sin(Math.PI / sides);
      const area_m2 = 2 * baseArea + perimeter * height;
      const volume_m3 = baseArea * height;
      return { area_m2, volume_m3 };
    }
    case "wedge": {
      if (!isFiniteNumber(size) || !isFiniteNumber(radius) || !isFiniteNumber(height)) return {};
      const width = size;
      const depth = radius * 2;
      const volume_m3 = width * depth * height * 0.5;
      const area_m2 =
        width * depth +
        width * height +
        width * Math.sqrt(height * height + depth * depth) +
        depth * height;
      return { area_m2, volume_m3 };
    }
    case "ellipsoid": {
      if (!isFiniteNumber(radius) || !isFiniteNumber(height) || !isFiniteNumber(size)) return {};
      const radiusX = radius;
      const radiusY = height * 0.5;
      const radiusZ = size * 0.5;
      const volume_m3 = (4 / 3) * Math.PI * radiusX * radiusY * radiusZ;
      return {
        volume_m3,
        inertia: (mass) => computeEllipsoidInertia(mass, radiusX, radiusY, radiusZ),
      };
    }
    default:
      return {};
  }
};

export const resolveDensity = (metadata?: Record<string, unknown>) => {
  if (!metadata) return undefined;
  const direct = metadata.density_kg_m3;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  const material = metadata.material;
  if (material && typeof material === "object") {
    const density = (material as { density_kg_m3?: unknown }).density_kg_m3;
    if (typeof density === "number" && Number.isFinite(density)) return density;
  }
  return undefined;
};

export const computePrimitivePhysicalProperties = (
  mesh: RenderMesh,
  primitive: MeshPrimitiveInfo,
  metadata?: Record<string, unknown>
) => {
  const areaFromMesh = computeMeshArea(mesh.positions, mesh.indices);
  const density = resolveDensity(metadata);
  const { volume_m3, centroid } = computeMeshVolumeAndCentroid(mesh);
  const analytic = computeAnalyticPrimitiveMetrics(primitive);
  const area = analytic.area_m2 ?? areaFromMesh;
  const volume = analytic.volume_m3 ?? volume_m3;

  if (!density) {
    return {
      area_m2: area,
      volume_m3: volume,
      centroid,
      mass_kg: undefined as number | undefined,
      inertiaTensor_kg_m2: undefined as InertiaTensor | undefined,
    };
  }

  const mass_kg = volume > 0 ? density * volume : undefined;
  const inertia =
    mass_kg && analytic.inertia ? analytic.inertia(mass_kg) : undefined;
  return {
    area_m2: area,
    volume_m3: volume,
    centroid,
    mass_kg,
    inertiaTensor_kg_m2: inertia,
  };
};
