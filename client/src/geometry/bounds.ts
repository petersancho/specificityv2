import type { RenderMesh, Vec3 } from "../types";

export interface Bounds3D {
  min: Vec3;
  max: Vec3;
}

export const computeBoundsFromPositions = (positions: Vec3[]): Bounds3D => {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const pos of positions) {
    min.x = Math.min(min.x, pos.x);
    min.y = Math.min(min.y, pos.y);
    min.z = Math.min(min.z, pos.z);
    max.x = Math.max(max.x, pos.x);
    max.y = Math.max(max.y, pos.y);
    max.z = Math.max(max.z, pos.z);
  }

  return { min, max };
};

export const computeBoundsFromMesh = (mesh: RenderMesh): Bounds3D => {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = mesh.positions[i];
    const y = mesh.positions[i + 1];
    const z = mesh.positions[i + 2];
    min.x = Math.min(min.x, x);
    min.y = Math.min(min.y, y);
    min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x);
    max.y = Math.max(max.y, y);
    max.z = Math.max(max.z, z);
  }

  return { min, max };
};

export const boundsCenter = (bounds: Bounds3D): Vec3 => ({
  x: (bounds.min.x + bounds.max.x) * 0.5,
  y: (bounds.min.y + bounds.max.y) * 0.5,
  z: (bounds.min.z + bounds.max.z) * 0.5,
});

export const boundsSize = (bounds: Bounds3D): Vec3 => ({
  x: bounds.max.x - bounds.min.x,
  y: bounds.max.y - bounds.min.y,
  z: bounds.max.z - bounds.min.z,
});

export const boundsVolume = (bounds: Bounds3D): number => {
  const size = boundsSize(bounds);
  return size.x * size.y * size.z;
};

export const boundsContainsPoint = (bounds: Bounds3D, point: Vec3): boolean => {
  return (
    point.x >= bounds.min.x &&
    point.x <= bounds.max.x &&
    point.y >= bounds.min.y &&
    point.y <= bounds.max.y &&
    point.z >= bounds.min.z &&
    point.z <= bounds.max.z
  );
};
