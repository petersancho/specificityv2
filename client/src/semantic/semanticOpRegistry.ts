export type SemanticOpId = string;

export type SemanticOpCategory = 
  | "initialize" 
  | "step" 
  | "finalize" 
  | "io" 
  | "analysis" 
  | "validation"
  | "optimization"
  | "other";

export type SemanticOpMeta = {
  id: SemanticOpId;
  label: string;
  description?: string;
  category?: SemanticOpCategory;
  defaultCostUnit?: number;
  docsUrl?: string;
};

const REGISTRY: Record<SemanticOpId, SemanticOpMeta> = {
  "solver.chemistry": {
    id: "solver.chemistry",
    label: "Chemistry Solver",
    description: "Material transmutation through particle simulation",
    category: "other",
  },
  "simulator.chemistry.initialize": {
    id: "simulator.chemistry.initialize",
    label: "Initialize Chemistry Simulation",
    description: "Set up particle system and material specifications",
    category: "initialize",
    defaultCostUnit: 10,
  },
  "simulator.chemistry.step": {
    id: "simulator.chemistry.step",
    label: "Chemistry Simulation Step",
    description: "Execute one iteration of particle-based material diffusion",
    category: "step",
    defaultCostUnit: 100,
  },
  "simulator.chemistry.converge": {
    id: "simulator.chemistry.converge",
    label: "Check Chemistry Convergence",
    description: "Evaluate convergence criteria for material distribution",
    category: "analysis",
    defaultCostUnit: 5,
  },
  "simulator.chemistry.finalize": {
    id: "simulator.chemistry.finalize",
    label: "Finalize Chemistry Simulation",
    description: "Generate voxel field and extract isosurface mesh",
    category: "finalize",
    defaultCostUnit: 50,
  },
  "solver.physics": {
    id: "solver.physics",
    label: "Physics Solver",
    description: "Structural equilibrium computation",
    category: "other",
  },
  "simulator.physics.initialize": {
    id: "simulator.physics.initialize",
    label: "Initialize Physics Simulation",
    description: "Set up finite element mesh and boundary conditions",
    category: "initialize",
    defaultCostUnit: 15,
  },
  "simulator.physics.step": {
    id: "simulator.physics.step",
    label: "Physics Simulation Step",
    description: "Solve equilibrium equations for current load state",
    category: "step",
    defaultCostUnit: 200,
  },
  "simulator.physics.converge": {
    id: "simulator.physics.converge",
    label: "Check Physics Convergence",
    description: "Evaluate force residuals and displacement convergence",
    category: "analysis",
    defaultCostUnit: 5,
  },
  "simulator.physics.finalize": {
    id: "simulator.physics.finalize",
    label: "Finalize Physics Simulation",
    description: "Extract stress fields and deformed geometry",
    category: "finalize",
    defaultCostUnit: 30,
  },
  "simulator.physics.applyLoads": {
    id: "simulator.physics.applyLoads",
    label: "Apply Loads",
    description: "Apply external forces and boundary conditions",
    category: "step",
    defaultCostUnit: 10,
  },
  "simulator.physics.computeStress": {
    id: "simulator.physics.computeStress",
    label: "Compute Stress",
    description: "Calculate stress tensor from strain field",
    category: "analysis",
    defaultCostUnit: 50,
  },
  "solver.evolutionary": {
    id: "solver.evolutionary",
    label: "Evolutionary Solver",
    description: "Genetic algorithm-based optimization",
    category: "other",
  },
  "simulator.initialize": {
    id: "simulator.initialize",
    label: "Initialize Simulation",
    description: "Set up simulation state and parameters",
    category: "initialize",
    defaultCostUnit: 10,
  },
  "simulator.step": {
    id: "simulator.step",
    label: "Simulation Step",
    description: "Execute one iteration of the simulation",
    category: "step",
    defaultCostUnit: 100,
  },
  "simulator.converge": {
    id: "simulator.converge",
    label: "Check Convergence",
    description: "Evaluate convergence criteria",
    category: "analysis",
    defaultCostUnit: 5,
  },
  "simulator.finalize": {
    id: "simulator.finalize",
    label: "Finalize Simulation",
    description: "Clean up and extract final results",
    category: "finalize",
    defaultCostUnit: 20,
  },
  "solver.voxel": {
    id: "solver.voxel",
    label: "Voxel Solver",
    description: "Geometry voxelization",
    category: "other",
  },
  "solver.topologyOptimization": {
    id: "solver.topologyOptimization",
    label: "Topology Optimization Solver",
    description: "Structural topology optimization",
    category: "other",
  },
};

export function getSemanticOpMeta(id: SemanticOpId): SemanticOpMeta {
  return REGISTRY[id] ?? { 
    id, 
    label: id.split('.').pop() || id, 
    category: "other",
    description: `Semantic operation: ${id}`,
  };
}

export function getAllSemanticOpMeta(): SemanticOpMeta[] {
  return Object.values(REGISTRY);
}

export function getSemanticOpsByCategory(category: SemanticOpCategory): SemanticOpMeta[] {
  return Object.values(REGISTRY).filter(op => op.category === category);
}
