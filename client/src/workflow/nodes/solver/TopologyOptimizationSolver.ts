import type { WorkflowNodeDefinition } from "../../nodeRegistry";
import type { Geometry, RenderMesh, Vec3, MeshGeometry } from "../../../types";
import type { GoalSpecification, VolumeGoal, StiffnessGoal, AnchorGoal, LoadGoal } from "./types";

/**
 * Topology Optimization Solver Node
 * 
 * This solver generates topologically optimized structures using:
 * 1. Goal-based optimization (volume, stiffness, anchor, load)
 * 2. Point cloud generation (optimized based on goals)
 * 3. Curve network generation (constrained connectivity)
 * 4. Multipipe operation (pipes along curves)
 * 
 * Named after Leonhard Euler (topology pioneer, Euler characteristic).
 */
export const TopologyOptimizationSolverNode: WorkflowNodeDefinition = {
  type: "topologyOptimizationSolver",
  label: "Topology Optimization",
  shortLabel: "TOPO",
  description: "Generates topologically optimized structures using goal-based optimization.",
  category: "solver",
  semanticOps: ['solver.topologyOptimization'],
  iconId: "topologyOptimizationSolver",
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      description: "Input geometry defines the domain for optimization.",
    },
    {
      key: "goals",
      label: "Goals",
      type: "goal",
      allowMultiple: true,
      description: "Optimization goals (volume, stiffness, anchor, load).",
    },
    {
      key: "pointDensity",
      label: "Point Density",
      type: "number",
      parameterKey: "pointDensity",
      defaultValue: 100,
      description: "Number of points to generate (10-1000).",
    },
    {
      key: "maxLinksPerPoint",
      label: "Max Links Per Point",
      type: "number",
      parameterKey: "maxLinksPerPoint",
      defaultValue: 4,
      description: "Maximum connectivity degree (2-8).",
    },
    {
      key: "maxSpanLength",
      label: "Max Span Length",
      type: "number",
      parameterKey: "maxSpanLength",
      defaultValue: 1.0,
      description: "Maximum distance between connected points (0.1-10.0).",
    },
    {
      key: "pipeRadius",
      label: "Pipe Radius",
      type: "number",
      parameterKey: "pipeRadius",
      defaultValue: 0.05,
      description: "Radius for multipipe operation (0.01-1.0).",
    },
  ],
  outputs: [
    {
      key: "optimizedMesh",
      label: "Optimized Mesh",
      type: "mesh",
      description: "Topologically optimized structure (multipipe result).",
    },
    {
      key: "pointCloud",
      label: "Point Cloud",
      type: "geometry",
      description: "Generated point cloud for visualization.",
    },
    {
      key: "curveNetwork",
      label: "Curve Network",
      type: "geometry",
      description: "Generated curve network for visualization.",
    },
    {
      key: "pointCount",
      label: "Point Count",
      type: "number",
      description: "Number of points generated.",
    },
    {
      key: "curveCount",
      label: "Curve Count",
      type: "number",
      description: "Number of curves generated.",
    },
    {
      key: "volume",
      label: "Volume",
      type: "number",
      description: "Volume of optimized structure.",
    },
    {
      key: "surfaceArea",
      label: "Surface Area",
      type: "number",
      description: "Surface area of optimized structure.",
    },
  ],
  parameters: [
    {
      key: "pointDensity",
      label: "Point Density",
      type: "number",
      defaultValue: 100,
      min: 10,
      max: 1000,
      step: 10,
      description: "Number of points to generate.",
    },
    {
      key: "maxLinksPerPoint",
      label: "Max Links Per Point",
      type: "number",
      defaultValue: 4,
      min: 2,
      max: 8,
      step: 1,
      description: "Maximum connectivity degree for each point.",
    },
    {
      key: "maxSpanLength",
      label: "Max Span Length",
      type: "number",
      defaultValue: 1.0,
      min: 0.1,
      max: 10.0,
      step: 0.1,
      description: "Maximum distance between connected points.",
    },
    {
      key: "pipeRadius",
      label: "Pipe Radius",
      type: "number",
      defaultValue: 0.05,
      min: 0.01,
      max: 1.0,
      step: 0.01,
      description: "Radius for multipipe operation.",
    },
    {
      key: "seed",
      label: "Random Seed",
      type: "number",
      defaultValue: 42,
      min: 0,
      max: 9999,
      step: 1,
      description: "Random seed for optimization.",
    },
  ],
  display: {
    nameGreek: "Ἐπιλύτης Τοπολογικῆς Βελτιστοποίησης",
    nameEnglish: "Topology Optimization Solver",
    romanization: "Epilýtēs Topologikís Veltitopoíisis",
    description: "Generates topologically optimized structures using point cloud → curve network → multipipe.",
  },
  customUI: {
    dashboardButton: {
      label: "Open Topology Simulator",
      component: "TopologyOptimizationSimulatorDashboard",
    },
  },
  compute: (args) => {
    const { parameters, inputs, context } = args;
    
    const pointDensity = Math.max(10, Math.min(1000, Math.round(
      Number(inputs.pointDensity ?? parameters.pointDensity ?? 100)
    )));
    const maxLinksPerPoint = Math.max(2, Math.min(8, Math.round(
      Number(inputs.maxLinksPerPoint ?? parameters.maxLinksPerPoint ?? 4)
    )));
    const maxSpanLength = Math.max(0.1, Math.min(10.0, 
      Number(inputs.maxSpanLength ?? parameters.maxSpanLength ?? 1.0)
    ));
    const pipeRadius = Math.max(0.01, Math.min(1.0, 
      Number(inputs.pipeRadius ?? parameters.pipeRadius ?? 0.05)
    ));
    const seed = Math.max(0, Math.min(9999, Math.round(
      Number(parameters.seed ?? 42)
    )));
    const simulationStep = parameters.simulationStep ?? 'idle';
    
    const emptyResult = {
      optimizedMesh: null,
      pointCloud: null,
      curveNetwork: null,
      pointCount: 0,
      curveCount: 0,
      volume: 0,
      surfaceArea: 0,
    };
    
    // Return empty result if simulation is idle
    if (simulationStep === 'idle') {
      return emptyResult;
    }
    
    // Get input geometry
    const geometryId = inputs.geometry as string | undefined;
    if (!geometryId) {
      return emptyResult;
    }
    
    const geometry = context.geometryById.get(geometryId) as Geometry | undefined;
    if (!geometry) {
      return emptyResult;
    }
    
    // Check if geometry has mesh data
    const meshGeometry = geometry as MeshGeometry;
    if (!meshGeometry.mesh || meshGeometry.type !== "mesh") {
      return emptyResult;
    }
    
    const mesh = meshGeometry.mesh;
    if (!mesh.positions || mesh.positions.length === 0) {
      return emptyResult;
    }
    
    // Get goals
    const goalsInput = inputs.goals;
    const goals: GoalSpecification[] = [];
    if (Array.isArray(goalsInput)) {
      for (const g of goalsInput) {
        if (g && typeof g === 'object') {
          goals.push(g as unknown as GoalSpecification);
        }
      }
    } else if (goalsInput && typeof goalsInput === 'object') {
      goals.push(goalsInput as unknown as GoalSpecification);
    }
    
    // NOTE: Actual optimization is performed in the simulator dashboard
    // using the SIMP algorithm. This node just returns empty results when idle.
    // The dashboard generates geometry directly and registers it in the store.
    return emptyResult;
  },
};
