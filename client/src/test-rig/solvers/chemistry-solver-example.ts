import { NODE_DEFINITIONS } from "../../workflow/nodeRegistry";
import type { RenderMesh } from "../../types";
import { createBoxGeometry, createTestContext, translateMeshGeometry, wrapMeshGeometry } from "./rig-utils";
import {
  buildChemistryConfig,
  buildChemistryGoalsBasic,
  buildChemistryGoalsRegions,
  buildChemistryMaterials,
  buildChemistrySeedsBasic,
  buildChemistrySeedsRegions,
  TEXT_INPUT_MATERIALS,
  TEXT_INPUT_SEEDS,
  type ChemistryFixtureVariant,
} from "./chemistry-solver-fixtures";
import { buildChemistrySolverRunReport, logChemistrySolverRunReport } from "./chemistry-solver-report";

const getNodeDefinition = (type: string) => {
  const node = NODE_DEFINITIONS.find((definition) => definition.type === type);
  if (!node) {
    throw new Error(`Missing node definition for ${type}`);
  }
  return node;
};

export const runChemistrySolverExample = (variant: ChemistryFixtureVariant = "regions") => {
  const solverNode = getNodeDefinition("chemistrySolver");
  const baseGeometry = createBoxGeometry("geo-chemistry", { width: 2.2, height: 1.4, depth: 1.6 });

  const anchorTop = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-anchorTop", { width: 2.0, height: 0.25, depth: 1.4 }),
    { x: 0, y: 0.55, z: 0 }
  );
  const anchorBottom = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-anchorBottom", { width: 2.0, height: 0.25, depth: 1.4 }),
    { x: 0, y: -0.55, z: 0 }
  );
  const thermalCore = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-thermalCore", { width: 0.7, height: 1.2, depth: 0.6 }),
    { x: 0, y: 0, z: 0 }
  );
  const visionStrip = translateMeshGeometry(
    createBoxGeometry("geo-chemistry-visionStrip", { width: 2.0, height: 1.1, depth: 0.35 }),
    { x: 0, y: 0, z: 0.55 }
  );

  const geometry = [baseGeometry, anchorTop, anchorBottom, thermalCore, visionStrip];
  const context = createTestContext("chemistry-context", geometry);

  const goals =
    variant === "basic"
      ? buildChemistryGoalsBasic()
      : buildChemistryGoalsRegions({ anchorTop, anchorBottom, thermalCore, visionStrip });

  const seeds = variant === "basic" ? buildChemistrySeedsBasic() : buildChemistrySeedsRegions();

  const materials = variant === "textInputs" ? [] : buildChemistryMaterials(baseGeometry.id);

  const config = buildChemistryConfig();

  const parameters = {
    geometryId: "chemistry-out",
    ...config,
    ...(variant === "textInputs"
      ? {
          materialsText: TEXT_INPUT_MATERIALS,
          seedsText: TEXT_INPUT_SEEDS,
        }
      : {}),
  };

  const outputs = solverNode.compute({
    inputs: {
      enabled: true,
      domain: baseGeometry.id,
      materials,
      materialsText: variant === "textInputs" ? TEXT_INPUT_MATERIALS : undefined,
      seeds,
      goals,
    },
    parameters,
    context,
  });

  const outputGeometry = wrapMeshGeometry(parameters.geometryId, outputs.mesh as RenderMesh);

  const report = buildChemistrySolverRunReport({
    label: `example/chemistry/${variant}`,
    variant,
    mesh: outputs.mesh as RenderMesh,
    goals,
    config,
    outputs: {
      status: outputs.status,
      totalEnergy: outputs.totalEnergy,
      materials: outputs.materials,
      materialParticles: outputs.materialParticles,
      materialField: outputs.materialField,
      history: outputs.history,
    },
  });

  logChemistrySolverRunReport(report);

  return {
    report,
    outputs,
    outputGeometry,
    baseGeometry,
    context,
    regions: variant === "regions" || variant === "textInputs"
      ? { anchorTop, anchorBottom, thermalCore, visionStrip }
      : null,
  };
};

const main = () => {
  runChemistrySolverExample("basic");
  runChemistrySolverExample("regions");
  runChemistrySolverExample("textInputs");
};

const maybeMain = (import.meta as ImportMeta & { main?: boolean }).main;
if (maybeMain === true) {
  main();
}
