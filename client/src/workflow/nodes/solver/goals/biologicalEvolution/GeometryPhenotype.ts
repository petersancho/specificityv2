import type { WorkflowNodeDefinition } from "../../../../nodeRegistry";
import { toList } from "../../utils";

export const GeometryPhenotypeNode: WorkflowNodeDefinition = {
  type: "geometryPhenotype",
  label: "Geometry Phenotype",
  shortLabel: "Phenotype",
  description: "Captures geometry outputs as a phenotype specification.",
  category: "goal",
  iconId: "goal",
  display: {
    nameEnglish: "Geometry Phenotype",
    description: "Captures geometry outputs as a phenotype specification.",
  },
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      allowMultiple: true,
      description: "Geometry outputs that define the phenotype.",
    },
  ],
  outputs: [
    {
      key: "phenotype",
      label: "Phenotype",
      type: "phenotypeSpec",
      description: "Phenotype specification for the Biological Solver.",
    },
  ],
  parameters: [],
  primaryOutputKey: "phenotype",
  compute: ({ inputs }) => {
    const entries = toList(inputs.geometry);
    const geometryIds = entries.filter((entry): entry is string => typeof entry === "string");
    return {
      phenotype: {
        geometryIds,
        visualizationMode: "mesh",
      },
    };
  },
};
