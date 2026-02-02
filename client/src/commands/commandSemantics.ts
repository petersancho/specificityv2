/**
 * Semantic linkage between Roslyn commands and semantic operations
 * 
 * This module provides machine-checkable mappings from command IDs to
 * the semantic operations they use, enabling validation, documentation,
 * and runtime introspection.
 */

import type { SemanticOpId } from "../semantic/semanticOpIds";

/**
 * Semantic classification for a command
 */
export type CommandSemantic =
  | { kind: "operation"; ops: readonly SemanticOpId[] }
  | { kind: "ui"; reason?: string };

/**
 * Mapping from command ID to semantic operations
 * 
 * This provides 100% semantic coverage: every command must be classified
 * as either an operation (with explicit semantic op IDs) or a UI command
 * (with optional reason).
 */
export const COMMAND_SEMANTICS: Record<string, CommandSemantic> = {
  // === CREATION COMMANDS ===
  point: { kind: "operation", ops: ["command.createPoint"] },
  line: { kind: "operation", ops: ["command.createLine"] },
  polyline: { kind: "operation", ops: ["command.createPolyline"] },
  rectangle: { kind: "operation", ops: ["command.createRectangle"] },
  circle: { kind: "operation", ops: ["command.createCircle"] },
  arc: { kind: "operation", ops: ["command.createArc"] },
  curve: { kind: "operation", ops: ["command.createCurve"] },
  
  // Primitives (from catalog)
  box: { kind: "operation", ops: ["command.createPrimitive"] },
  sphere: { kind: "operation", ops: ["command.createPrimitive"] },
  cylinder: { kind: "operation", ops: ["command.createPrimitive"] },
  cone: { kind: "operation", ops: ["command.createPrimitive"] },
  torus: { kind: "operation", ops: ["command.createPrimitive"] },
  plane: { kind: "operation", ops: ["command.createPrimitive"] },
  tube: { kind: "operation", ops: ["command.createPrimitive"] },
  pyramid: { kind: "operation", ops: ["command.createPrimitive"] },
  tetrahedron: { kind: "operation", ops: ["command.createPrimitive"] },
  octahedron: { kind: "operation", ops: ["command.createPrimitive"] },
  dodecahedron: { kind: "operation", ops: ["command.createPrimitive"] },
  icosahedron: { kind: "operation", ops: ["command.createPrimitive"] },
  hemisphere: { kind: "operation", ops: ["command.createPrimitive"] },
  capsule: { kind: "operation", ops: ["command.createPrimitive"] },
  disk: { kind: "operation", ops: ["command.createPrimitive"] },
  ring: { kind: "operation", ops: ["command.createPrimitive"] },
  "triangular-prism": { kind: "operation", ops: ["command.createPrimitive"] },
  "hexagonal-prism": { kind: "operation", ops: ["command.createPrimitive"] },
  "pentagonal-prism": { kind: "operation", ops: ["command.createPrimitive"] },
  "torus-knot": { kind: "operation", ops: ["command.createPrimitive"] },
  "utah-teapot": { kind: "operation", ops: ["command.createPrimitive"] },
  frustum: { kind: "operation", ops: ["command.createPrimitive"] },
  "mobius-strip": { kind: "operation", ops: ["command.createPrimitive"] },
  ellipsoid: { kind: "operation", ops: ["command.createPrimitive"] },
  wedge: { kind: "operation", ops: ["command.createPrimitive"] },
  "spherical-cap": { kind: "operation", ops: ["command.createPrimitive"] },
  bipyramid: { kind: "operation", ops: ["command.createPrimitive"] },
  "rhombic-dodecahedron": { kind: "operation", ops: ["command.createPrimitive"] },
  "truncated-cube": { kind: "operation", ops: ["command.createPrimitive"] },
  "truncated-octahedron": { kind: "operation", ops: ["command.createPrimitive"] },
  "truncated-icosahedron": { kind: "operation", ops: ["command.createPrimitive"] },
  pipe: { kind: "operation", ops: ["command.createPrimitive"] },
  superellipsoid: { kind: "operation", ops: ["command.createPrimitive"] },
  "hyperbolic-paraboloid": { kind: "operation", ops: ["command.createPrimitive"] },
  "geodesic-dome": { kind: "operation", ops: ["command.createPrimitive"] },
  "one-sheet-hyperboloid": { kind: "operation", ops: ["command.createPrimitive"] },
  
  // NURBS primitives
  nurbsbox: { kind: "operation", ops: ["command.createNurbsBox"] },
  nurbssphere: { kind: "operation", ops: ["command.createNurbsSphere"] },
  nurbscylinder: { kind: "operation", ops: ["command.createNurbsCylinder"] },
  
  // === OPERATION COMMANDS ===
  boolean: { kind: "operation", ops: ["command.boolean"] },
  loft: { kind: "operation", ops: ["command.loft"] },
  surface: { kind: "operation", ops: ["command.surface"] },
  extrude: { kind: "operation", ops: ["command.extrude"] },
  meshmerge: { kind: "operation", ops: ["command.meshMerge"] },
  meshflip: { kind: "operation", ops: ["command.meshFlip"] },
  meshthicken: { kind: "operation", ops: ["command.meshThicken"] },
  morph: { kind: "operation", ops: ["command.morph"] },
  
  // === CONVERSION COMMANDS ===
  meshconvert: { kind: "operation", ops: ["command.meshConvert"] },
  breptomesh: { kind: "operation", ops: ["command.brepToMesh"] },
  meshtobrep: { kind: "operation", ops: ["command.meshToBrep"] },
  nurbsrestore: { kind: "operation", ops: ["command.nurbsRestore"] },
  interpolate: { kind: "operation", ops: ["command.interpolate"] },
  
  // === TRANSFORM COMMANDS ===
  move: { kind: "operation", ops: ["command.move"] },
  rotate: { kind: "operation", ops: ["command.rotate"] },
  scale: { kind: "operation", ops: ["command.scale"] },
  offset: { kind: "operation", ops: ["command.offset"] },
  mirror: { kind: "operation", ops: ["command.mirror"] },
  array: { kind: "operation", ops: ["command.array"] },
  transform: { kind: "operation", ops: ["command.transform"] },
  
  // === UI COMMANDS ===
  undo: { kind: "operation", ops: ["command.undo"] },
  redo: { kind: "operation", ops: ["command.redo"] },
  copy: { kind: "operation", ops: ["command.copy"] },
  paste: { kind: "operation", ops: ["command.paste"] },
  duplicate: { kind: "operation", ops: ["command.duplicate"] },
  delete: { kind: "operation", ops: ["command.delete"] },
  cancel: { kind: "operation", ops: ["command.cancel"] },
  confirm: { kind: "operation", ops: ["command.confirm"] },
  gumball: { kind: "operation", ops: ["command.gumball"] },
  focus: { kind: "operation", ops: ["command.focus"] },
  frameall: { kind: "operation", ops: ["command.frameAll"] },
  screenshot: { kind: "operation", ops: ["command.screenshot"] },
  view: { kind: "operation", ops: ["command.view"] },
  camera: { kind: "operation", ops: ["command.camera"] },
  pivot: { kind: "operation", ops: ["command.pivot"] },
  orbit: { kind: "operation", ops: ["command.orbit"] },
  pan: { kind: "operation", ops: ["command.pan"] },
  zoom: { kind: "operation", ops: ["command.zoom"] },
  selectionfilter: { kind: "operation", ops: ["command.selectionFilter"] },
  cycle: { kind: "operation", ops: ["command.cycle"] },
  snapping: { kind: "operation", ops: ["command.snapping"] },
  grid: { kind: "operation", ops: ["command.grid"] },
  cplane: { kind: "operation", ops: ["command.cplane"] },
  display: { kind: "operation", ops: ["command.display"] },
  isolate: { kind: "operation", ops: ["command.isolate"] },
  outliner: { kind: "operation", ops: ["command.outliner"] },
  tolerance: { kind: "operation", ops: ["command.tolerance"] },
  status: { kind: "operation", ops: ["command.status"] },
};

/**
 * Gets semantic operations for a command
 * 
 * @param commandId - The command ID
 * @returns The semantic classification for the command
 */
export function getCommandSemantic(commandId: string): CommandSemantic | undefined {
  return COMMAND_SEMANTICS[commandId];
}

/**
 * Checks if a command uses semantic operations
 * 
 * @param commandId - The command ID
 * @returns True if the command uses semantic operations
 */
export function commandUsesSemanticOps(commandId: string): boolean {
  const semantic = COMMAND_SEMANTICS[commandId];
  return semantic?.kind === "operation";
}

/**
 * Gets all semantic operation IDs used by a command
 * 
 * @param commandId - The command ID
 * @returns Array of semantic operation IDs, or empty array if none
 */
export function getCommandSemanticOps(commandId: string): readonly SemanticOpId[] {
  const semantic = COMMAND_SEMANTICS[commandId];
  return semantic?.kind === "operation" ? semantic.ops : [];
}
