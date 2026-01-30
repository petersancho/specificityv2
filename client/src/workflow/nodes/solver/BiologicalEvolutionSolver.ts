import type { WorkflowNodeDefinition } from "../nodeRegistry";
import { getBiologicalSolverOutputs } from "./biological/solverState";

export const BiologicalEvolutionSolverNode: WorkflowNodeDefinition = {
  type: "biologicalEvolutionSolver",
  label: "Biological Solver",
  shortLabel: "Bio",
  description: "Interactive evolutionary solver for genome-driven design exploration.",
  category: "solver",
  iconId: "biologicalSolver",
  display: {
    nameEnglish: "Biological Solver",
    description: "Interactive evolutionary solver for genome-driven design exploration.",
  },
  inputs: [
    {
      key: "genome",
      label: "Genome",
      type: "genomeSpec",
      required: true,
      description: "Genome specification from Genome Collector.",
    },
    {
      key: "geometry",
      label: "Geometry",
      type: "phenotypeSpec",
      required: true,
      description: "Phenotype specification from Geometry Phenotype.",
    },
    {
      key: "performs",
      label: "Performs",
      type: "fitnessSpec",
      description: "Fitness specification from Performs Fitness.",
    },
    {
      key: "goals",
      label: "Goals",
      type: "goal",
      allowMultiple: true,
      description: "Optional biological goal specifications (growth, nutrient, morphogenesis, homeostasis).",
    },
    {
      key: "domain",
      label: "Domain",
      type: "geometry",
      description: "Optional geometry reference that seeds the search.",
    },
  ],
  outputs: [
    {
      key: "best",
      label: "Best",
      type: "any",
      description: "Best individual found across all generations.",
    },
    {
      key: "populationBests",
      label: "Population Bests",
      type: "any",
      description: "Top individuals per generation.",
    },
    {
      key: "history",
      label: "History",
      type: "any",
      description: "Full evolutionary history and statistics.",
    },
    {
      key: "gallery",
      label: "Gallery",
      type: "any",
      description: "Gallery metadata for all individuals.",
    },
    {
      key: "selectedGeometry",
      label: "Selected Geometry",
      type: "geometry",
      description: "Selected solver outputs as geometry ids.",
    },
  ],
  parameters: [],
  primaryOutputKey: "best",
  compute: ({ context }) => getBiologicalSolverOutputs(context.nodeId),
};
