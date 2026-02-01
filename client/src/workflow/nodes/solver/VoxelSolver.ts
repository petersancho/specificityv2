import type { WorkflowNodeDefinition } from "../../nodeRegistry";

type VoxelSolverHelpers = {
  buildVoxelGridFromGeometry: (
    geometry: any,
    context: any,
    resolution: number,
    padding: number,
    mode: string,
    thickness: number
  ) => any;
  buildVoxelMesh: (grid: any, isoValue: number) => any;
  resolveGeometryInput: (inputs: any, context: any, options?: any) => any;
  readNumberParameter: (parameters: any, key: string, fallback: number) => number;
  clampNumber: (value: number, min: number, max: number) => number;
};

export const createVoxelSolverNode = (
  baseDefinition: WorkflowNodeDefinition,
  helpers?: VoxelSolverHelpers
): WorkflowNodeDefinition => ({
  type: "voxelSolver",
  label: "Ἐπιλύτης Φογκελ",
  shortLabel: "Voxel",
  description: "Voxelize geometry and extract isosurface mesh.",
  category: "solver",
  iconId: baseDefinition.iconId ?? "solver",
  display: {
    nameGreek: "Ἐπιλύτης Φογκελ",
    nameEnglish: "Voxel Solver",
    romanization: "Epilýtēs Fogkel",
    description: "Voxelize geometry and extract an isosurface mesh.",
  },
  inputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      required: true,
      description: "Geometry to voxelize.",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "number",
      parameterKey: "resolution",
      description: "Number of voxels per axis (4-36).",
    },
    {
      key: "padding",
      label: "Padding",
      type: "number",
      parameterKey: "padding",
      description: "Extra space around geometry bounds.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "number",
      parameterKey: "mode",
      description: "Voxelization mode: 0=solid, 1=surface.",
    },
    {
      key: "thickness",
      label: "Thickness",
      type: "number",
      parameterKey: "thickness",
      description: "Surface thickness in voxel layers.",
    },
    {
      key: "isoValue",
      label: "Iso Value",
      type: "number",
      parameterKey: "isoValue",
      description: "Density threshold for isosurface (0-1).",
    },
  ],
  outputs: [
    {
      key: "geometry",
      label: "Geometry",
      type: "geometry",
      required: true,
      description: "Voxelized geometry output.",
    },
    {
      key: "mesh",
      label: "Mesh",
      type: "any",
      description: "Extracted isosurface mesh.",
    },
    {
      key: "voxelGrid",
      label: "Grid",
      type: "any",
      description: "Voxel grid with densities.",
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "number",
      description: "Actual resolution used.",
    },
  ],
  parameters: [
    {
      key: "resolution",
      label: "Resolution",
      type: "number",
      defaultValue: 12,
      min: 4,
      max: 36,
      step: 1,
      description: "Number of voxels per axis.",
    },
    {
      key: "padding",
      label: "Padding",
      type: "number",
      defaultValue: 0.2,
      min: 0,
      max: 10,
      step: 0.1,
      description: "Extra space around geometry bounds.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "number",
      defaultValue: 0,
      min: 0,
      max: 1,
      step: 1,
      description: "Voxelization mode: 0=solid, 1=surface.",
    },
    {
      key: "thickness",
      label: "Thickness",
      type: "number",
      defaultValue: 1,
      min: 0,
      max: 4,
      step: 1,
      description: "Surface thickness in voxel layers.",
    },
    {
      key: "isoValue",
      label: "Iso Value",
      type: "number",
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      description: "Density threshold for isosurface extraction.",
    },
  ],
  primaryOutputKey: "geometry",
  compute: ({ inputs, parameters, context }) => {
    if (!helpers) {
      return {
        geometry: null,
        mesh: { positions: [], normals: [], uvs: [], indices: [] },
        voxelGrid: null,
        resolution: 12,
      };
    }

    const geometry = helpers.resolveGeometryInput(inputs, context, { allowMissing: true });
    if (!geometry) {
      return {
        geometry: null,
        mesh: { positions: [], normals: [], uvs: [], indices: [] },
        voxelGrid: null,
        resolution: 12,
      };
    }

    const readNumber = (inputKey: string, paramKey: string, fallback: number): number => {
      const inputValue = inputs[inputKey];
      if (typeof inputValue === "number" && Number.isFinite(inputValue)) {
        return inputValue;
      }
      return helpers!.readNumberParameter(parameters, paramKey, fallback);
    };

    const resolution = Math.max(4, Math.min(36, Math.round(readNumber("resolution", "resolution", 12))));
    const padding = Math.max(0, readNumber("padding", "padding", 0.2));
    const modeValue = Math.round(readNumber("mode", "mode", 0));
    const mode = modeValue === 1 ? "surface" : "solid";
    const thickness = Math.max(0, Math.min(4, Math.round(readNumber("thickness", "thickness", 1))));
    const isoValue = helpers.clampNumber(readNumber("isoValue", "isoValue", 0.5), 0, 1);

    const grid = helpers.buildVoxelGridFromGeometry(
      geometry,
      context,
      resolution,
      padding,
      mode,
      thickness
    );

    const mesh = helpers.buildVoxelMesh(grid, isoValue);

    const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;

    return {
      geometry: geometryId,
      mesh,
      voxelGrid: grid,
      resolution: grid.resolution?.x ?? resolution,
    };
  },
});
