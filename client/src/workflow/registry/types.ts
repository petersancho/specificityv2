import type { IconId } from "../../webgl/ui/WebGLIconRenderer";
import type { Geometry, VertexGeometry } from "../../types";
import type { NodeType } from "../nodeTypes";
import type { SemanticOpId } from "../../semantic";

export type WorkflowPortType =
  | "number"
  | "boolean"
  | "string"
  | "vector"
  | "geometry"
  | "mesh"
  | "nurb"
  | "brep"
  | "renderMesh"
  | "voxelGrid"
  | "goal"
  | "genomeSpec"
  | "phenotypeSpec"
  | "fitnessSpec"
  | "solverResult"
  | "animation"
  | "any";

export type WorkflowPortSpec = {
  key: string;
  label: string;
  type: WorkflowPortType;
  required?: boolean;
  allowMultiple?: boolean;
  description?: string;
  parameterKey?: string;
  defaultValue?: unknown;
};

export type WorkflowParameterType =
  | "number"
  | "boolean"
  | "string"
  | "textarea"
  | "select"
  | "file"
  | "slider"
  | "color";

export type WorkflowParameterOption = {
  value: string;
  label: string;
};

export type WorkflowParameterSpec = {
  key: string;
  label: string;
  type: WorkflowParameterType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  minKey?: string;
  maxKey?: string;
  stepKey?: string;
  options?: WorkflowParameterOption[];
  accept?: string;
  description?: string;
  enabled?: (parameters: Record<string, unknown>) => boolean;
};

export type NodeCategoryId =
  | "data"
  | "basics"
  | "lists"
  | "primitives"
  | "curves"
  | "nurbs"
  | "brep"
  | "mesh"
  | "tessellation"
  | "transforms"
  | "arrays"
  | "modifiers"
  | "measurement"
  | "euclidean"
  | "ranges"
  | "signals"
  | "analysis"
  | "interop"
  | "voxel"
  | "solver"
  | "goal"
  | "optimization"
  | "math"
  | "logic";

export type NodeCategory = {
  id: NodeCategoryId;
  label: string;
  description: string;
  accent: string;
  band: string;
  port: string;
};

type PortResolver = (parameters: Record<string, unknown>) => WorkflowPortSpec[];

type PortsDefinition = WorkflowPortSpec[] | PortResolver;

type WorkflowPrimitive =
  | number
  | string
  | boolean
  | { x: number; y: number; z: number }
  | Record<string, unknown>;

export type WorkflowValue = WorkflowPrimitive | WorkflowValue[] | null | undefined;

export type WorkflowComputeContext = {
  nodeId: string;
  geometryById: Map<string, Geometry>;
  vertexById: Map<string, VertexGeometry>;
};

export type WorkflowComputeArgs = {
  inputs: Record<string, WorkflowValue>;
  parameters: Record<string, unknown>;
  context: WorkflowComputeContext;
};

export type WorkflowNodeDefinition = {
  type: NodeType;
  label: string;
  shortLabel: string;
  description: string;
  category: NodeCategoryId;
  iconId: IconId;
  semanticOps?: readonly SemanticOpId[];
  display?: {
    nameGreek?: string;
    nameEnglish?: string;
    romanization?: string;
    description?: string;
  };
  customUI?: {
    dashboardButton?: {
      label: string;
      component: string;
    };
  };
  inputs: PortsDefinition;
  outputs: PortsDefinition;
  parameters: WorkflowParameterSpec[];
  primaryOutputKey?: string;
  compute: (args: WorkflowComputeArgs) => Record<string, WorkflowValue>;
};
