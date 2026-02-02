/**
 * Semantic operation definitions for array domain
 * 
 * This module defines semantic metadata for array operations.
 */

import type { SemanticOpMeta } from "../semanticOp";

export const ARRAY_OPS: readonly SemanticOpMeta[] = [
  {
    id: "geometry.array.linear",
    domain: "geometry",
    name: "Linear Array",
    category: "utility",
    tags: ["geometry", "array", "linear", "transform"],
    complexity: "O(n)",
    cost: "low",
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: "Creates a linear array of geometry along a vector",
    stable: true,
    since: "1.0.0",
  },
  {
    id: "geometry.array.polar",
    domain: "geometry",
    name: "Polar Array",
    category: "utility",
    tags: ["geometry", "array", "polar", "circular", "transform"],
    complexity: "O(n)",
    cost: "low",
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: "Creates a polar array of geometry around an axis",
    stable: true,
    since: "1.0.0",
  },
  {
    id: "geometry.array.grid",
    domain: "geometry",
    name: "Grid Array",
    category: "utility",
    tags: ["geometry", "array", "grid", "2d", "transform"],
    complexity: "varies",
    cost: "medium",
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: "Creates a 2D grid array of geometry",
    stable: true,
    since: "1.0.0",
  },
  {
    id: "geometry.array.geometry",
    domain: "geometry",
    name: "Geometry Array",
    category: "utility",
    tags: ["geometry", "array", "custom", "transform"],
    complexity: "O(n)",
    cost: "medium",
    pure: true,
    deterministic: true,
    sideEffects: [],
    summary: "Creates an array of geometry along a custom path or pattern",
    stable: true,
    since: "1.0.0",
  },
];
