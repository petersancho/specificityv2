import type { RenderMesh, Vec3 } from "../../types";
import {
  generateBoxMesh,
  generateCylinderMesh,
  generateSphereMesh,
  generateCapsuleMesh,
  generateTorusMesh,
  mergeMeshes,
} from "../../geometry/mesh";
import { shallowCloneRenderMesh, translateRenderMesh } from "./rig-utils";

type GeometryQuality = "low" | "medium" | "high";

const getQuality = (): GeometryQuality => {
  const env = typeof process !== "undefined" ? process.env?.SOLVER_RIG_GEOM_QUALITY : undefined;
  return (env as GeometryQuality) ?? "medium";
};

const qualitySegments = (low: number, med: number, high: number): number => {
  const q = getQuality();
  return q === "low" ? low : q === "high" ? high : med;
};

const rotateMeshY = (mesh: RenderMesh, radians: number): RenderMesh => {
  const result = shallowCloneRenderMesh(mesh);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  for (let i = 0; i < result.positions.length; i += 3) {
    const x = result.positions[i];
    const z = result.positions[i + 2];
    result.positions[i] = x * cos - z * sin;
    result.positions[i + 2] = x * sin + z * cos;
  }
  if (result.normals) {
    for (let i = 0; i < result.normals.length; i += 3) {
      const nx = result.normals[i];
      const nz = result.normals[i + 2];
      result.normals[i] = nx * cos - nz * sin;
      result.normals[i + 2] = nx * sin + nz * cos;
    }
  }
  return result;
};

const scaleMesh = (mesh: RenderMesh, sx: number, sy: number, sz: number): RenderMesh => {
  const result = shallowCloneRenderMesh(mesh);
  for (let i = 0; i < result.positions.length; i += 3) {
    result.positions[i] *= sx;
    result.positions[i + 1] *= sy;
    result.positions[i + 2] *= sz;
  }
  if (result.normals) {
    const invSx = 1 / sx;
    const invSy = 1 / sy;
    const invSz = 1 / sz;
    for (let i = 0; i < result.normals.length; i += 3) {
      const nx = result.normals[i] * invSx;
      const ny = result.normals[i + 1] * invSy;
      const nz = result.normals[i + 2] * invSz;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0) {
        result.normals[i] = nx / len;
        result.normals[i + 1] = ny / len;
        result.normals[i + 2] = nz / len;
      }
    }
  }
  return result;
};

export const buildPhysicsHeroGeometry = (): RenderMesh => {
  const segs = qualitySegments(8, 16, 32);
  
  const baseWidth = 3.0;
  const baseDepth = 0.4;
  const baseHeight = 0.3;
  const base = scaleMesh(
    generateBoxMesh({ width: baseWidth, height: baseHeight, depth: baseDepth }, 1),
    1,
    1,
    1
  );
  
  const webHeight = 2.0;
  const webThickness = 0.25;
  const web = translateRenderMesh(
    scaleMesh(
      generateBoxMesh({ width: baseWidth * 0.8, height: webHeight, depth: webThickness }, 1),
      1,
      1,
      1
    ),
    { x: 0, y: baseHeight / 2 + webHeight / 2, z: 0 }
  );
  
  const ribWidth = 0.2;
  const ribLength = Math.sqrt(webHeight * webHeight + baseDepth * baseDepth) * 0.7;
  const rib1 = translateRenderMesh(
    rotateMeshY(
      scaleMesh(
        generateBoxMesh({ width: baseWidth * 0.6, height: ribWidth, depth: ribLength }, 1),
        1,
        1,
        1
      ),
      Math.PI / 2
    ),
    { x: 0, y: baseHeight / 2 + webHeight * 0.4, z: -baseDepth * 0.3 }
  );
  
  const plateWidth = baseWidth * 0.9;
  const plateHeight = 0.25;
  const plateDepth = 0.8;
  const plate = translateRenderMesh(
    scaleMesh(
      generateBoxMesh({ width: plateWidth, height: plateHeight, depth: plateDepth }, 1),
      1,
      1,
      1
    ),
    { x: 0, y: baseHeight / 2 + webHeight + plateHeight / 2, z: 0 }
  );
  
  const holeRadius = 0.15;
  const holeDepth = plateHeight * 1.2;
  const holeSegs = qualitySegments(8, 12, 24);
  const hole1 = translateRenderMesh(
    rotateMeshY(
      generateCylinderMesh({ radius: holeRadius, height: holeDepth }, holeSegs, 1, false, false),
      Math.PI / 2
    ),
    { x: -plateWidth * 0.3, y: baseHeight / 2 + webHeight + plateHeight / 2, z: 0 }
  );
  const hole2 = translateRenderMesh(
    rotateMeshY(
      generateCylinderMesh({ radius: holeRadius, height: holeDepth }, holeSegs, 1, false, false),
      Math.PI / 2
    ),
    { x: plateWidth * 0.3, y: baseHeight / 2 + webHeight + plateHeight / 2, z: 0 }
  );
  
  const filletRadius = 0.12;
  const filletSegs = qualitySegments(6, 10, 16);
  const fillet1 = translateRenderMesh(
    rotateMeshY(
      generateCapsuleMesh({ radius: filletRadius, height: baseWidth * 0.7 }, filletSegs, filletSegs),
      Math.PI / 2
    ),
    { x: 0, y: baseHeight / 2, z: -webThickness / 2 }
  );
  
  return mergeMeshes([base, web, rib1, plate, hole1, hole2, fillet1]);
};

export const buildChemistryHeroGeometry = (): {
  base: RenderMesh;
  regions: { shell: RenderMesh; core: RenderMesh; fibers: RenderMesh; inclusions: RenderMesh };
} => {
  const segs = qualitySegments(16, 32, 64);
  
  const bodyRadius = 1.0;
  const bodyHeight = 3.0;
  const body = generateCylinderMesh({ radius: bodyRadius, height: bodyHeight }, segs, 4, true, true);
  
  const neckRadius = 0.6;
  const neckHeight = 0.8;
  const neck = translateRenderMesh(
    generateCylinderMesh({ radius: neckRadius, height: neckHeight }, segs, 2, true, true),
    { x: 0, y: bodyHeight / 2 + neckHeight / 2, z: 0 }
  );
  
  const shoulderRadius = 0.15;
  const shoulderSegs = qualitySegments(8, 12, 20);
  const shoulder = translateRenderMesh(
    generateTorusMesh({ radius: bodyRadius * 0.85, tube: shoulderRadius }, segs, shoulderSegs),
    { x: 0, y: bodyHeight / 2, z: 0 }
  );
  
  const base = mergeMeshes([body, neck, shoulder]);
  
  const shellThickness = 0.15;
  const shell = scaleMesh(body, 1.05, 1.0, 1.05);
  
  const coreRadius = bodyRadius * 0.5;
  const coreHeight = bodyHeight * 0.6;
  const core = generateCylinderMesh({ radius: coreRadius, height: coreHeight }, segs / 2, 2, true, true);
  
  const fiberRadius = 0.08;
  const fiberHeight = bodyHeight * 0.9;
  const fiberSegs = qualitySegments(6, 8, 12);
  const fiber1 = translateRenderMesh(
    generateCylinderMesh({ radius: fiberRadius, height: fiberHeight }, fiberSegs, 2, true, true),
    { x: bodyRadius * 0.6, y: 0, z: 0 }
  );
  const fiber2 = translateRenderMesh(
    generateCylinderMesh({ radius: fiberRadius, height: fiberHeight }, fiberSegs, 2, true, true),
    { x: -bodyRadius * 0.6, y: 0, z: 0 }
  );
  const fiber3 = translateRenderMesh(
    generateCylinderMesh({ radius: fiberRadius, height: fiberHeight }, fiberSegs, 2, true, true),
    { x: 0, y: 0, z: bodyRadius * 0.6 }
  );
  const fiber4 = translateRenderMesh(
    generateCylinderMesh({ radius: fiberRadius, height: fiberHeight }, fiberSegs, 2, true, true),
    { x: 0, y: 0, z: -bodyRadius * 0.6 }
  );
  const fibers = mergeMeshes([fiber1, fiber2, fiber3, fiber4]);
  
  const inclusionRadius = 0.2;
  const inclusionSegs = qualitySegments(8, 12, 20);
  const inclusion1 = translateRenderMesh(
    generateSphereMesh({ radius: inclusionRadius }, inclusionSegs),
    { x: bodyRadius * 0.4, y: bodyHeight * 0.3, z: bodyRadius * 0.4 }
  );
  const inclusion2 = translateRenderMesh(
    generateSphereMesh({ radius: inclusionRadius * 0.8 }, inclusionSegs),
    { x: -bodyRadius * 0.5, y: -bodyHeight * 0.2, z: -bodyRadius * 0.3 }
  );
  const inclusion3 = translateRenderMesh(
    generateSphereMesh({ radius: inclusionRadius * 1.2 }, inclusionSegs),
    { x: 0, y: bodyHeight * 0.1, z: -bodyRadius * 0.5 }
  );
  const inclusions = mergeMeshes([inclusion1, inclusion2, inclusion3]);
  
  return {
    base,
    regions: { shell, core, fibers, inclusions },
  };
};

export const buildVoxelHeroGeometry = (): RenderMesh => {
  const segs = qualitySegments(12, 20, 32);
  
  const blockSize = 2.5;
  const block = generateBoxMesh({ width: blockSize, height: blockSize, depth: blockSize }, 1);
  
  const tunnelRadius = 0.3;
  const tunnelLength = blockSize * 1.2;
  const tunnelSegs = qualitySegments(8, 12, 20);
  
  const tunnelsX: RenderMesh[] = [];
  const tunnelsY: RenderMesh[] = [];
  const tunnelsZ: RenderMesh[] = [];
  
  const spacing = 0.8;
  const count = 3;
  for (let i = -count; i <= count; i++) {
    for (let j = -count; j <= count; j++) {
      tunnelsX.push(
        translateRenderMesh(
          rotateMeshY(
            generateCylinderMesh({ radius: tunnelRadius, height: tunnelLength }, tunnelSegs, 1, false, false),
            Math.PI / 2
          ),
          { x: 0, y: i * spacing, z: j * spacing }
        )
      );
      
      tunnelsY.push(
        translateRenderMesh(
          generateCylinderMesh({ radius: tunnelRadius, height: tunnelLength }, tunnelSegs, 1, false, false),
          { x: i * spacing, y: 0, z: j * spacing }
        )
      );
      
      tunnelsZ.push(
        translateRenderMesh(
          rotateMeshY(
            generateCylinderMesh({ radius: tunnelRadius, height: tunnelLength }, tunnelSegs, 1, false, false),
            0
          ),
          { x: i * spacing, y: j * spacing, z: 0 }
        )
      );
    }
  }
  
  const allTunnels = [...tunnelsX, ...tunnelsY, ...tunnelsZ];
  const tunnelsMesh = mergeMeshes(allTunnels);
  
  const junctionRadius = tunnelRadius * 1.3;
  const junctionSegs = qualitySegments(6, 10, 16);
  const junctions: RenderMesh[] = [];
  for (let i = -count; i <= count; i++) {
    for (let j = -count; j <= count; j++) {
      for (let k = -count; k <= count; k++) {
        junctions.push(
          translateRenderMesh(
            generateSphereMesh({ radius: junctionRadius }, junctionSegs),
            { x: i * spacing, y: j * spacing, z: k * spacing }
          )
        );
      }
    }
  }
  const junctionsMesh = mergeMeshes(junctions);
  
  return mergeMeshes([block, tunnelsMesh, junctionsMesh]);
};

export const buildBiologicalHeroGeometry = (): RenderMesh => {
  const segs = qualitySegments(16, 24, 48);
  
  const tissueRadius = 1.5;
  const tissue = scaleMesh(
    generateSphereMesh({ radius: tissueRadius }, segs),
    1.2,
    1.0,
    0.9
  );
  
  const vesselRadius = 0.12;
  const vesselSegs = qualitySegments(8, 12, 16);
  
  const mainVessel = generateCylinderMesh({ radius: vesselRadius, height: tissueRadius * 1.8 }, vesselSegs, 4, true, true);
  
  const branch1Length = tissueRadius * 0.8;
  const branch1 = translateRenderMesh(
    rotateMeshY(
      generateCylinderMesh({ radius: vesselRadius * 0.8, height: branch1Length }, vesselSegs, 3, true, true),
      Math.PI / 4
    ),
    { x: 0, y: tissueRadius * 0.3, z: 0 }
  );
  
  const branch2 = translateRenderMesh(
    rotateMeshY(
      generateCylinderMesh({ radius: vesselRadius * 0.8, height: branch1Length }, vesselSegs, 3, true, true),
      -Math.PI / 4
    ),
    { x: 0, y: tissueRadius * 0.3, z: 0 }
  );
  
  const branch3 = translateRenderMesh(
    rotateMeshY(
      generateCylinderMesh({ radius: vesselRadius * 0.7, height: branch1Length * 0.7 }, vesselSegs, 2, true, true),
      Math.PI / 3
    ),
    { x: 0, y: -tissueRadius * 0.2, z: 0 }
  );
  
  const branch4 = translateRenderMesh(
    rotateMeshY(
      generateCylinderMesh({ radius: vesselRadius * 0.7, height: branch1Length * 0.7 }, vesselSegs, 2, true, true),
      -Math.PI / 3
    ),
    { x: 0, y: -tissueRadius * 0.2, z: 0 }
  );
  
  const junctionRadius = vesselRadius * 1.5;
  const junctionSegs = qualitySegments(8, 12, 16);
  const junction1 = translateRenderMesh(
    generateSphereMesh({ radius: junctionRadius }, junctionSegs),
    { x: 0, y: tissueRadius * 0.3, z: 0 }
  );
  const junction2 = translateRenderMesh(
    generateSphereMesh({ radius: junctionRadius * 0.9 }, junctionSegs),
    { x: 0, y: -tissueRadius * 0.2, z: 0 }
  );
  
  const alveolus1 = translateRenderMesh(
    generateSphereMesh({ radius: 0.15 }, qualitySegments(6, 10, 14)),
    { x: tissueRadius * 0.6, y: tissueRadius * 0.4, z: tissueRadius * 0.3 }
  );
  const alveolus2 = translateRenderMesh(
    generateSphereMesh({ radius: 0.12 }, qualitySegments(6, 10, 14)),
    { x: -tissueRadius * 0.5, y: tissueRadius * 0.3, z: -tissueRadius * 0.4 }
  );
  const alveolus3 = translateRenderMesh(
    generateSphereMesh({ radius: 0.18 }, qualitySegments(6, 10, 14)),
    { x: tissueRadius * 0.4, y: -tissueRadius * 0.5, z: tissueRadius * 0.2 }
  );
  const alveolus4 = translateRenderMesh(
    generateSphereMesh({ radius: 0.14 }, qualitySegments(6, 10, 14)),
    { x: -tissueRadius * 0.6, y: -tissueRadius * 0.3, z: tissueRadius * 0.5 }
  );
  
  return mergeMeshes([
    tissue,
    mainVessel,
    branch1,
    branch2,
    branch3,
    branch4,
    junction1,
    junction2,
    alveolus1,
    alveolus2,
    alveolus3,
    alveolus4,
  ]);
};
