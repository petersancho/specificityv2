import { runBiologicalSolverRig } from "../client/src/test-rig/solvers/solver-rigs";
import type { Geometry, RenderMesh } from "../client/src/types";
import type {
  Individual,
  SolverOutputs,
} from "../client/src/workflow/nodes/solver/biological/types";

type GeometrySummary =
  | {
      id: string;
      type: string;
      vertexCount: number;
      indexCount: number;
    }
  | {
      id: string;
      type: string;
    };

type MeshGeometry = Extract<Geometry, { type: "mesh" }>;

const summarizeGeometry = (item: Geometry | null | undefined): GeometrySummary => {
  if (item?.type === "mesh") {
    const mesh = (item as MeshGeometry).mesh as RenderMesh | undefined;
    const positions = Array.isArray(mesh?.positions) ? mesh.positions : [];
    const indices = Array.isArray(mesh?.indices) ? mesh.indices : [];
    return {
      id: item.id,
      type: "mesh",
      vertexCount: Math.floor(positions.length / 3),
      indexCount: indices.length,
    };
  }

  return {
    id: item ? item.id : "unknown",
    type: item ? item.type : "unknown",
  };
};

const summarizeIndividual = (individual: Individual | null) => {
  if (!individual) return individual;
  const geometry = Array.isArray(individual.geometry)
    ? individual.geometry.map(summarizeGeometry)
    : individual.geometry;
  return {
    ...individual,
    geometry,
  };
};

type SolverOutputsLike = Pick<
  SolverOutputs,
  "best" | "populationBests" | "history" | "gallery" | "selectedGeometry"
>;

type BiologicalSolverNodeOutputs = SolverOutputsLike & {
  bestScore: number;
  bestGenome: { x: number; y: number; z: number };
  evaluations: number;
  populationSize: number;
  generations: number;
  mutationRate: number;
  status: string;
};

const summarizeSolverOutputs = (outputs: SolverOutputsLike) => {
  const history = outputs.history
    ? {
        ...outputs.history,
        generations: Array.isArray(outputs.history.generations)
          ? outputs.history.generations.map((generation) => ({
              ...generation,
              population: Array.isArray(generation.population)
                ? generation.population.map(summarizeIndividual)
                : generation.population,
            }))
          : outputs.history.generations,
      }
    : outputs.history;

  const gallery = outputs.gallery
    ? {
        ...outputs.gallery,
        allIndividuals: Array.isArray(outputs.gallery.allIndividuals)
          ? outputs.gallery.allIndividuals.map(summarizeIndividual)
          : outputs.gallery.allIndividuals,
        byGeneration: outputs.gallery.byGeneration,
      }
    : outputs.gallery;

  return {
    ...outputs,
    best: summarizeIndividual(outputs.best),
    populationBests: Array.isArray(outputs.populationBests)
      ? outputs.populationBests.map((entry) => ({
          ...entry,
          individuals: Array.isArray(entry.individuals)
            ? entry.individuals.map(summarizeIndividual)
            : entry.individuals,
        }))
      : outputs.populationBests,
    history,
    gallery,
  };
};

const summarizeBiologicalSolverNodeOutputs = (outputs: BiologicalSolverNodeOutputs) => ({
  ...outputs,
  ...summarizeSolverOutputs(outputs),
});

const summarizeEvolutionOutputs = (outputs: SolverOutputs) => summarizeSolverOutputs(outputs);

export const buildBranchingGrowthExample = () => {
  const { biologicalOutputs, evolutionOutputs, best, baseGeometry, config } =
    runBiologicalSolverRig();

  const biologicalSummary = summarizeBiologicalSolverNodeOutputs(
    biologicalOutputs as BiologicalSolverNodeOutputs
  );
  const evolutionSummary = summarizeEvolutionOutputs(evolutionOutputs as SolverOutputs);

  return {
    schemaVersion: 1,
    solver: {
      type: "biologicalSolver",
      nameGreek: "Ἐπιλύτης Βιολογίας",
      nameEnglish: "Branching Growth",
      romanization: "Epilýtēs Biologías",
    },
    rig: {
      baseGeometry: summarizeGeometry(baseGeometry),
      bestIndividualId: best.id,
      config,
    },
    outputs: biologicalSummary,
    interactiveOutputs: evolutionSummary,
  };
};

const main = () => {
  const example = buildBranchingGrowthExample();
  console.log(JSON.stringify(example, null, 2));
};

interface BunImportMeta extends ImportMeta {
  main?: boolean;
}

const meta = import.meta as BunImportMeta;

if (meta.main) {
  main();
}
