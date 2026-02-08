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
import tokens from "../semantic/ui.tokens.json";

/**
 * Semantic color palette - the foundation of all workflow colors
 */
export const MONO_PALETTE = {
  numeric: tokens.palette.categories.math ?? tokens.palette.grey600,
  logic: tokens.palette.categories.goal ?? tokens.palette.grey800,
  data: tokens.palette.categories.primitives ?? tokens.palette.grey400,
  structure: tokens.palette.categories.primitives ?? tokens.palette.black,
} as const;

/**
 * Semantic color groups for port types
 */
export type PortColorGroup = "numeric" | "logic" | "text" | "structure";

/**
 * Mapping from semantic groups to CMYK colors
 */
const GROUP_COLOR: Record<PortColorGroup, string> = {
  numeric: MONO_PALETTE.numeric,
  logic: MONO_PALETTE.logic,
  text: MONO_PALETTE.data,
  structure: MONO_PALETTE.structure,
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
  return GROUP_COLOR[group] ?? tokens.palette.grey800;
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
  numeric: tokens.palette.categories.math ?? tokens.palette.grey600,
  logic: tokens.palette.categories.goal ?? tokens.palette.grey800,
  data: tokens.palette.categories.workflow ?? tokens.palette.grey400,
  structure: tokens.palette.categories.primitives ?? tokens.palette.black,
};

/**
 * Get the CMYK accent color for a given node category
 */
export function getCategoryAccentColor(categoryId: NodeCategoryId): string {
  const group = CATEGORY_COLOR_GROUP[categoryId];
  return CATEGORY_GROUP_COLOR[group] ?? tokens.palette.grey800;
}

/**
 * Get uniform grey for node bands (monochrome design)
 * All categories use the same grey band color for cleaner UI
 */
export function getCategoryBandColor(_categoryId: NodeCategoryId): string {
  return tokens.palette.grey200;
}

/**
 * Get uniform grey for port backgrounds (monochrome design)
 * All categories use the same grey port color
 */
export function getCategoryPortColor(_categoryId: NodeCategoryId): string {
  return tokens.palette.grey400;
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
 * Sticker tint colors for node icons
 * Monochrome gray variations for visual differentiation
 */
export const categoryColors = tokens.palette.categories;
const categoryOr = (key: keyof typeof categoryColors, fallback: string) =>
  categoryColors[key] ?? fallback;

export const STICKER_TINTS: Record<string, string> = {
  data: categoryOr("workflow", tokens.palette.grey400),
  basics: categoryOr("primitives", tokens.palette.grey400),
  lists: categoryOr("workflow", tokens.palette.grey400),
  primitives: categoryOr("primitives", tokens.palette.grey600),
  curves: categoryOr("curve", tokens.palette.grey600),
  nurbs: categoryOr("nurbs", tokens.palette.grey600),
  brep: categoryOr("brep", tokens.palette.grey600),
  mesh: categoryOr("workflow", tokens.palette.grey400),
  tessellation: categoryOr("primitives", tokens.palette.grey600),
  modifiers: categoryOr("primitives", tokens.palette.grey600),
  transforms: categoryOr("primitives", tokens.palette.grey600),
  arrays: categoryOr("workflow", tokens.palette.grey400),
  euclidean: categoryOr("workflow", tokens.palette.grey400),
  ranges: categoryOr("math", tokens.palette.grey600),
  signals: categoryOr("math", tokens.palette.grey600),
  analysis: categoryOr("analysis", tokens.palette.grey400),
  interop: categoryOr("workflow", tokens.palette.grey400),
  measurement: categoryOr("analysis", tokens.palette.grey400),
  voxel: categoryOr("voxel", tokens.palette.grey800),
  solver: categoryOr("solver", tokens.palette.grey800),
  goal: categoryOr("goal", tokens.palette.grey800),
  optimization: categoryOr("workflow", tokens.palette.accentRed),
  math: categoryOr("math", tokens.palette.grey600),
  logic: categoryOr("goal", tokens.palette.grey800),
};

/**
 * Get the sticker tint color for a node category
 * Returns normalized hex color or undefined for unknown categories
 */
export function getStickerTint(categoryId: string | null | undefined): string | undefined {
  if (!categoryId) return undefined;
  const color = STICKER_TINTS[categoryId];
  if (!color) return undefined;
  // Normalize to lowercase hex
  return color.toLowerCase();
}

/**
 * CMYK color convention documentation
 */
export const COLOR_CONVENTIONS = {
  description: "Lingua uses a strict monochrome palette for all workflow UI elements",
  palette: MONO_PALETTE,
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
