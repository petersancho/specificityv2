import type { RenderMesh } from "../../types";
import { generateBoxMesh } from "../../geometry/mesh";

export const buildPhysicsHeroGeometry = (): RenderMesh => {
  return generateBoxMesh({ width: 2, height: 1.2, depth: 1.5 }, 24);
};

export const buildChemistryHeroGeometry = () => {
  const base = generateBoxMesh({ width: 2, height: 1.2, depth: 1.5 }, 16);
  const shell = generateBoxMesh({ width: 2, height: 0.3, depth: 1.5 }, 8);
  const core = generateBoxMesh({ width: 0.6, height: 0.6, depth: 0.6 }, 8);
  const fibers = generateBoxMesh({ width: 0.4, height: 1.2, depth: 0.4 }, 8);
  const inclusions = generateBoxMesh({ width: 1.8, height: 0.2, depth: 0.2 }, 6);

  return {
    base,
    regions: {
      shell,
      core,
      fibers,
      inclusions,
    },
  };
};

export const buildVoxelHeroGeometry = (): RenderMesh => {
  return generateBoxMesh({ width: 2, height: 1.2, depth: 1.5 }, 16);
};
