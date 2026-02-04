/**
 * Semantic Color Convention System for Lingua Workflow
 * 
 * This module establishes a consistent color palette based on CMYK primaries
 * for all workflow UI elements including port types, node categories, and
 * visual feedback states.
 * 
 * SEMANTIC COLOR GROUPS:
 * - Numeric: Numbers, vectors, parameters
 * - Logic: Booleans, goals, constraints
 * - Data: Strings, specs, metadata
 * - Structure: Geometry, meshes, voxels
 * 
 * VISUAL CONVENTIONS:
 * - Input ports: stroke = color, fill = transparent
 * - Output ports: fill = color, stroke = color
 * - Hover states: 80% opacity
 * - Disabled states: 40% opacity
 */

import type { WorkflowPortType } from "./registry/types";
import type { NodeCategoryId } from "./registry/types";
import { UI_DOMAIN_COLORS } from "../semantic/uiColorTokens";

/**
 * Semantic color palette - the foundation of all workflow colors
 */
export const CMYK = {
  cyan: UI_DOMAIN_COLORS.data,
  magenta: UI_DOMAIN_COLORS.logic,
  yellow: UI_DOMAIN_COLORS.numeric,
  black: UI_DOMAIN_COLORS.structure,
} as const;

/**
 * Semantic color groups for port types
 */
export type PortColorGroup = "numeric" | "logic" | "text" | "structure";

/**
 * Mapping from semantic groups to CMYK colors
 */
const GROUP_COLOR: Record<PortColorGroup, string> = {
  numeric: CMYK.yellow,    // Numbers, vectors, scalars
  logic: CMYK.magenta,     // Booleans, goals, constraints
  text: CMYK.cyan,         // Strings, specs, metadata
  structure: CMYK.black,   // Geometry, meshes, voxels
};

/**
 * Mapping from port types to semantic groups
 */
export const PORT_TYPE_GROUP: Record<WorkflowPortType, PortColorGroup> = {
  // Numeric data
  number: "numeric",
  vector: "numeric",

  // Logic and constraints
  boolean: "logic",
  goal: "logic",
  fitnessSpec: "logic",

  // Text and metadata
  string: "text",
  genomeSpec: "text",
  phenotypeSpec: "text",

  // Geometry and structure
  geometry: "structure",
  mesh: "structure",
  nurb: "structure",
  brep: "structure",
  renderMesh: "structure",
  voxelGrid: "structure",
  animation: "structure",
  solverResult: "structure",
  any: "structure",
};

/**
 * Get the CMYK color for a given port type
 */
export function getPortTypeColor(type: WorkflowPortType): string {
  const group = PORT_TYPE_GROUP[type];
  return GROUP_COLOR[group] ?? CMYK.black;
}

/**
 * Semantic color groups for node categories
 */
export type CategoryColorGroup = "numeric" | "logic" | "data" | "structure";

/**
 * Mapping from node categories to semantic groups
 */
export const CATEGORY_COLOR_GROUP: Record<NodeCategoryId, CategoryColorGroup> = {
  // Numeric/parametric operations
  math: "numeric",
  basics: "numeric",
  arrays: "numeric",
  ranges: "numeric",
  signals: "numeric",

  // Logic and optimization
  logic: "logic",
  goal: "logic",
  optimization: "logic",

  // Data and metadata
  data: "data",
  lists: "data",
  interop: "data",
  measurement: "data",
  analysis: "data",

  // Geometry and structure
  primitives: "structure",
  curves: "structure",
  nurbs: "structure",
  brep: "structure",
  mesh: "structure",
  tessellation: "structure",
  modifiers: "structure",
  transforms: "structure",
  euclidean: "structure",
  voxel: "structure",
  solver: "structure",
};

/**
 * Mapping from category groups to CMYK colors
 */
const CATEGORY_GROUP_COLOR: Record<CategoryColorGroup, string> = {
  numeric: CMYK.yellow,
  logic: CMYK.magenta,
  data: CMYK.cyan,
  structure: CMYK.black,
};

/**
 * Get the CMYK accent color for a given node category
 */
export function getCategoryAccentColor(categoryId: NodeCategoryId): string {
  const group = CATEGORY_COLOR_GROUP[categoryId];
  return CATEGORY_GROUP_COLOR[group] ?? CMYK.black;
}

/**
 * Get a lighter tint of a CMYK color for band/background use
 * Returns a color with 10% opacity for subtle backgrounds
 */
export function getCategoryBandColor(categoryId: NodeCategoryId): string {
  const accent = getCategoryAccentColor(categoryId);
  // Convert hex to rgba with 10% opacity
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

/**
 * Get a medium tint of a CMYK color for port backgrounds
 * Returns a color with 40% opacity
 */
export function getCategoryPortColor(categoryId: NodeCategoryId): string {
  const accent = getCategoryAccentColor(categoryId);
  // Convert hex to rgba with 40% opacity
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.4)`;
}

/**
 * Get hover state color (80% opacity)
 */
export function getHoverColor(baseColor: string): string {
  if (baseColor.startsWith("rgba")) {
    return baseColor.replace(/[\d.]+\)$/, "0.8)");
  }
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.8)`;
}

/**
 * Get disabled state color (40% opacity)
 */
export function getDisabledColor(baseColor: string): string {
  if (baseColor.startsWith("rgba")) {
    return baseColor.replace(/[\d.]+\)$/, "0.4)");
  }
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.4)`;
}

/**
 * CMYK color convention documentation
 */
export const COLOR_CONVENTIONS = {
  description: "Lingua uses a strict CMYK color palette for all workflow UI elements",
  palette: CMYK,
  semantics: {
    yellow: "Numeric/Scalar/Vector data (numbers, vectors, parameters)",
    magenta: "Logic/Boolean/Goals/Constraints (decisions, optimization)",
    cyan: "Text/String/Specs/Metadata (identifiers, documentation)",
    black: "Geometry/Structure/Mesh/Voxel (3D objects, spatial data)",
  },
  portConventions: {
    input: "Stroke = color, fill = transparent",
    output: "Fill = color, stroke = color",
    hover: "80% opacity",
    disabled: "40% opacity",
  },
  categoryConventions: {
    accent: "Full CMYK color for headers and labels",
    band: "10% opacity for subtle backgrounds",
    port: "40% opacity for port backgrounds",
  },
} as const;
