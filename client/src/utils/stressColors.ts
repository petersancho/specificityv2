/**
 * Stress Colors - Physics Solver Visualization
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * New code should use gradientColors.ts instead.
 * 
 * Re-exports buildStressVertexColors from the unified gradient system.
 */

import type { RenderMesh } from "../types";
import { buildStressVertexColors as buildStressVertexColorsNew } from "./gradientColors";

export const buildStressVertexColors = buildStressVertexColorsNew;
