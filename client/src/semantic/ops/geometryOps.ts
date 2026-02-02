/**
 * Semantic operation definitions for geometry domain
 * 
 * This module defines semantic metadata for geometry operations,
 * linking geometry nodes to backend operations.
 */

import type { SemanticOpMeta } from "../semanticOp";

export const GEOMETRY_OPS: readonly SemanticOpMeta[] = [
  // === GEOMETRY PASS-THROUGH ===
  {
    id: "geometry.mesh",
    domain: "geometry",
    name: "Mesh",
    category: "passthrough",
    tags: ["geometry", "mesh", "tessellation"],
    complexity: "O(1)",
    cost: "low",
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: "Pass-through node for mesh geometry",
    stable: true,
    since: "1.0.0",
  },
  {
    id: "geometry.brep",
    domain: "geometry",
    name: "B-Rep",
    category: "passthrough",
    tags: ["geometry", "brep", "solid"],
    complexity: "O(1)",
    cost: "low",
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: "Pass-through node for B-Rep geometry",
    stable: true,
    since: "1.0.0",
  },
];
