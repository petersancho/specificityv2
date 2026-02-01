import type { WorkflowNodeDefinition, WorkflowComputeContext } from "../../nodeRegistry";
import type { Geometry, VoxelGrid, RenderMesh } from "../../../types";

type VoxelSolverHelpers = {
  buildVoxelGridFromGeometry: (
    geometry: Geometry,
    context: WorkflowComputeContext,
    resolution: number,
    padding: number,
    mode: string,
    thickness: number
  ) => VoxelGrid;
  buildVoxelMesh: (grid: VoxelGrid, isoValue: number) => RenderMesh;
  resolveGeometryInput: (
    inputs: Record<string, unknown>,
    context: WorkflowComputeContext,
    options?: { allowMissing?: boolean }
  ) => Geometry | null;
  readNumberParameter: (parameters: Record<string, unknown>, key: string, fallback: number) => number;
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
      type: "mesh",
      required: true,
      description: "Voxelized mesh geometry ID.",
    },
    {
      key: "meshData",
      label: "Mesh Data",
      type: "renderMesh",
      description: "Raw mesh data (positions, indices, normals).",
    },
    {
      key: "voxelGrid",
      label: "Grid",
      type: "voxelGrid",
      description: "Voxel grid (resolution, bounds, densities).",
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
      throw new Error("VoxelSolver: helpers not initialized");
    }

    const geometry = helpers.resolveGeometryInput(inputs, context, { allowMissing: false });
    if (!geometry) {
      throw new Error("VoxelSolver: no input geometry provided");
    }

    const readNumber = (inputKey: string, paramKey: string, fallback: number): number => {
      const inputValue = inputs[inputKey];
      if (typeof inputValue === "number" && Number.isFinite(inputValue)) {
        return inputValue;
      }
      return helpers!.readNumberParameter(parameters, paramKey, fallback);
    };

    const resolution = Math.round(helpers.clampNumber(readNumber("resolution", "resolution", 12), 4, 36));
    const padding = helpers.clampNumber(readNumber("padding", "padding", 0.2), 0, 10);
    const modeValue = Math.round(readNumber("mode", "mode", 0));
    const mode = modeValue === 1 ? "surface" : "solid";
    const thickness = Math.round(helpers.clampNumber(readNumber("thickness", "thickness", 1), 0, 4));
    const isoValue = helpers.clampNumber(readNumber("isoValue", "isoValue", 0.5), 0, 1);

    const grid = helpers.buildVoxelGridFromGeometry(
      geometry,
      context,
      resolution,
      padding,
      mode,
      thickness
    );

    const meshData = helpers.buildVoxelMesh(grid, isoValue);
    
    const geometryId = typeof parameters.geometryId === "string" ? parameters.geometryId : null;

    return {
      geometry: geometryId,
      meshData,
      voxelGrid: grid,
      resolution: grid.resolution?.x ?? resolution,
    };
  },
});
