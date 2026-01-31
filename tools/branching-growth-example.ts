import { runBiologicalSolverRig } from "../client/src/test-rig/solvers/solver-rigs";

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

const summarizeGeometry = (item: any): GeometrySummary => {
  if (item && typeof item === "object" && item.type === "mesh" && item.mesh) {
    const positions = Array.isArray(item.mesh.positions) ? item.mesh.positions : [];
    const indices = Array.isArray(item.mesh.indices) ? item.mesh.indices : [];
    return {
      id: String(item.id),
      type: "mesh",
      vertexCount: Math.floor(positions.length / 3),
      indexCount: indices.length,
    };
  }

  return {
    id: item && typeof item === "object" ? String(item.id) : "unknown",
    type: item && typeof item === "object" ? String(item.type) : "unknown",
  };
};

const summarizeIndividual = (individual: any) => {
  if (!individual || typeof individual !== "object") return individual;
  const geometry = Array.isArray(individual.geometry)
    ? individual.geometry.map(summarizeGeometry)
    : individual.geometry;
  return {
    ...individual,
    geometry,
  };
};

const summarizeSolverOutputs = (outputs: any) => {
  if (!outputs || typeof outputs !== "object") return outputs;

  const history = outputs.history
    ? {
        ...outputs.history,
        generations: Array.isArray(outputs.history.generations)
          ? outputs.history.generations.map((generation: any) => ({
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
      ? outputs.populationBests.map((entry: any) => ({
          ...entry,
          individuals: Array.isArray(entry.individuals)
            ? entry.individuals.map(summarizeIndividual)
            : entry.individuals,
        }))
      : outputs.populationBests,
    history,
    gallery,
    selectedGeometry: outputs.selectedGeometry,
  };
};

export const buildBranchingGrowthExample = () => {
  const { biologicalOutputs, evolutionOutputs, best, baseGeometry, config } =
    runBiologicalSolverRig();

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
    outputs: summarizeSolverOutputs(biologicalOutputs),
    interactiveOutputs: summarizeSolverOutputs(evolutionOutputs),
  };
};

const main = () => {
  const example = buildBranchingGrowthExample();
  console.log(JSON.stringify(example, null, 2));
};

if ((import.meta as any).main) {
  main();
}
