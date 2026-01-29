import type { NodeType } from "../../workflow/nodeTypes";
import {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  PORT_TYPE_COLOR,
  coerceValueToPortType,
  getDefaultParameters,
  getNodeDefinition,
  isPortTypeCompatible,
  resolveNodeParameters,
  resolveNodePorts,
  resolvePortByKey,
  type NodeCategory,
  type NodeCategoryId,
  type WorkflowNodeDefinition,
  type WorkflowParameterSpec,
  type WorkflowPortSpec,
  type WorkflowPortType,
  type WorkflowValue,
} from "../../workflow/nodeRegistry";

export {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  PORT_TYPE_COLOR,
  coerceValueToPortType,
  getDefaultParameters,
  getNodeDefinition,
  isPortTypeCompatible,
  resolveNodeParameters,
  resolveNodePorts,
  resolvePortByKey,
  type NodeCategory,
  type NodeCategoryId,
  type WorkflowNodeDefinition as NodeDefinition,
  type WorkflowParameterSpec,
  type WorkflowPortSpec,
  type WorkflowPortType,
  type WorkflowValue,
};

const NODE_IMPLEMENTATION_NOTES: Partial<Record<NodeType, string>> = {
  fillet: "Applies to polylines; rebuilds curve with rounded corners.",
  filletEdges: "Bevels selected mesh edges with new faces and adjustable segments.",
  thickenMesh: "Builds a shell by offsetting normals and stitching boundary edges.",
  plasticwrap: "Raycasts along normals when available; blends toward target projection.",
  solid: "Caps boundary loops; falls back to double-sided for closed meshes.",
  fieldTransformation: "Samples vector/scalar fields with spatial falloff to displace geometry.",
  voxelizeGeometry:
    "Builds a voxel grid from geometry bounds; surface mode paints around samples.",
  extractIsosurface:
    "Boxes every voxel above the iso value; internal faces are culled; output caps at ~160k faces; accepts grids or flat density lists.",
  topologyOptimize:
    "Settings-only node; connect outputs into Topology Solver and monitor status.",
  topologySolver:
    "Deterministic density solver on a cubic grid; non-cubic inputs are remapped.",
  biologicalSolver:
    "Deterministic evolutionary search over vector genomes; returns best score + genome.",
  colorPicker: "Outputs an RGB vector and hex string from a swatch.",
  customMaterial: "Sets a render-only color on geometry metadata.",
  group: "Visual-only container; double-click the title to rename.",
  panel: "Read-only data viewer; falls back to typed text when no input is connected.",
  textNote: "Freeform note that can display + pass through data.",
  annotations: "Shows a 3D annotation badge in Roslyn.",
  dimensions: "Shows live bounding dimensions in Roslyn.",
};

const formatPortLabel = (port: WorkflowPortSpec) => {
  const label = port.label?.trim() || port.key;
  return `${label} (${port.type})`;
};

const formatPortSummary = (
  ports: WorkflowPortSpec[] | undefined,
  label: string,
  maxItems = 3
) => {
  if (!ports || ports.length === 0) return null;
  const entries = ports.map(formatPortLabel);
  const shown = entries.slice(0, maxItems);
  const remaining = entries.length - shown.length;
  const summary =
    remaining > 0 ? `${shown.join(", ")}, +${remaining} more` : shown.join(", ");
  return `${label}: ${summary}`;
};

export const buildNodeTooltipLines = (
  definition?: WorkflowNodeDefinition,
  ports?: { inputs: WorkflowPortSpec[]; outputs: WorkflowPortSpec[] }
) => {
  if (!definition) return [];
  const lines: string[] = [];
  if (definition.description) {
    lines.push(definition.description);
  }
  const note = NODE_IMPLEMENTATION_NOTES[definition.type];
  if (note) {
    lines.push(note);
  }
  const inputLine = formatPortSummary(ports?.inputs, "Inputs");
  const outputLine = formatPortSummary(ports?.outputs, "Outputs");
  if (inputLine) lines.push(inputLine);
  if (outputLine) lines.push(outputLine);
  return lines;
};

export const getDefaultNodePorts = (definition: WorkflowNodeDefinition) => {
  const parameters = getDefaultParameters(definition.type);
  return resolveNodePorts(
    { type: definition.type, data: { label: definition.label } },
    parameters
  );
};
