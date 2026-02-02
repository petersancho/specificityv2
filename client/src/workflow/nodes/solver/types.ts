import type { RenderMesh, Vec3 } from "../../../types";

export type GoalType =
  | "stiffness"
  | "volume"
  | "load"
  | "anchor"
  | "chemStiffness"
  | "chemMass"
  | "chemBlend"
  | "chemTransparency"
  | "chemThermal";

export type AnalysisType = "static" | "dynamic" | "modal";

export interface GoalSpecification {
  goalType: GoalType;
  weight: number;
  target?: number;
  constraint?: {
    min?: number;
    max?: number;
  };
  geometry: {
    elements: number[];
    region?: {
      min: Vec3;
      max: Vec3;
    };
  };
  parameters: Record<string, unknown>;
}

export interface StiffnessGoal extends GoalSpecification {
  goalType: "stiffness";
  parameters: {
    youngModulus: number;
    poissonRatio: number;
    targetStiffness?: number;
  };
}

export interface VolumeGoal extends GoalSpecification {
  goalType: "volume";
  parameters: {
    targetVolume?: number;
    materialDensity: number;
    allowedDeviation: number;
  };
}

export interface LoadGoal extends GoalSpecification {
  goalType: "load";
  parameters: {
    force: Vec3;
    applicationPoints: number[];
    distributed: boolean;
    loadType: "static" | "dynamic" | "cyclic";
    timeProfile?: number[];
    frequency?: number;
  };
}

export interface AnchorGoal extends GoalSpecification {
  goalType: "anchor";
  parameters: {
    fixedDOF: {
      x: boolean;
      y: boolean;
      z: boolean;
      rotX?: boolean;
      rotY?: boolean;
      rotZ?: boolean;
    };
    anchorType?: "fixed" | "pinned" | "roller" | "custom";
    springStiffness?: number;
  };
}



export interface ChemistryStiffnessGoal extends GoalSpecification {
  goalType: "chemStiffness";
  parameters: {
    loadVector: Vec3;
    structuralPenalty: number;
    regionGeometryIds?: string[];
  };
}

export interface ChemistryMassGoal extends GoalSpecification {
  goalType: "chemMass";
  parameters: {
    targetMassFraction?: number;
    densityPenalty: number;
  };
}

export interface ChemistryBlendGoal extends GoalSpecification {
  goalType: "chemBlend";
  parameters: {
    smoothness: number;
    diffusivity?: number;
  };
}

export interface ChemistryTransparencyGoal extends GoalSpecification {
  goalType: "chemTransparency";
  parameters: {
    opticalWeight: number;
    regionGeometryIds?: string[];
  };
}

export interface ChemistryThermalGoal extends GoalSpecification {
  goalType: "chemThermal";
  parameters: {
    mode: "conduct" | "insulate";
    thermalWeight: number;
    regionGeometryIds?: string[];
  };
}

export interface SolverConfiguration {
  maxIterations: number;
  convergenceTolerance: number;
  analysisType: AnalysisType;
  timeStep?: number;
  animationFrames?: number;
  useGPU?: boolean;
  chunkSize: number;
  safetyLimits: {
    maxDeformation: number;
    maxStress: number;
    memoryLimitMB?: number;
  };
}

export interface SolverInput {
  mesh: RenderMesh;
  goals: GoalSpecification[];
  config: SolverConfiguration;
}

export interface SolverResult {
  success: boolean;
  iterations: number;
  convergenceAchieved: boolean;
  finalObjectiveValue: number;
  deformedMesh?: RenderMesh;
  animation?: {
    frames: RenderMesh[];
    timeStamps: number[];
  };
  stressField?: number[];
  displacements?: Vec3[];
  warnings: string[];
  errors: string[];
  performanceMetrics: {
    computeTime: number;
    memoryUsed: number;
  };
}
