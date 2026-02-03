import type { RenderMesh } from "../../types";
import { createTestContext, wrapMeshGeometry } from "./rig-utils";
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
import { buildChemistryHeroGeometry } from "./solver-hero-geometry";
import { getNodeDefinition } from "../utils/test-utils";

export const runChemistrySolverExample = (variant: ChemistryFixtureVariant = "regions") => {
  const solverNode = getNodeDefinition("chemistrySolver");
  const heroGeometry = buildChemistryHeroGeometry();
  const baseGeometry = wrapMeshGeometry("geo-chemistry", heroGeometry.base);

  const anchorTop = wrapMeshGeometry("geo-chemistry-shell", heroGeometry.regions.shell);
  const anchorBottom = wrapMeshGeometry("geo-chemistry-core", heroGeometry.regions.core);
  const thermalCore = wrapMeshGeometry("geo-chemistry-fibers", heroGeometry.regions.fibers);
  const visionStrip = wrapMeshGeometry("geo-chemistry-inclusions", heroGeometry.regions.inclusions);

  const geometry = [baseGeometry, anchorTop, anchorBottom, thermalCore, visionStrip];
  const context = createTestContext("chemistry-context", geometry);

  const goals =
    variant === "basic"
      ? buildChemistryGoalsBasic()
      : buildChemistryGoalsRegions({ anchorTop, anchorBottom, thermalCore, visionStrip });

  const goalsValue: Record<string, unknown>[] = goals.map((goal) => ({
    goalType: goal.goalType,
    weight: goal.weight,
    target: goal.target,
    constraint: goal.constraint,
    geometry: goal.geometry,
    parameters: goal.parameters,
  }));

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
      goals: goalsValue,
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
      materials: outputs.materials as unknown[],
      materialParticles: outputs.materialParticles as unknown[],
      materialField: outputs.materialField,
      history: outputs.history as unknown[],
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
