/**
 * Semantic metadata for geometry operations
 * 
 * This module defines the semantic layer for geometry kernel operations,
 * enabling formal linkage between nodes and operations, validation,
 * documentation generation, and future UI features.
 */

export type OpCategory =
  | 'primitive'      // Generates new geometry from parameters
  | 'modifier'       // Modifies existing geometry
  | 'tessellation'   // Converts between representations
  | 'transform'      // Spatial transformations
  | 'analysis'       // Computes properties without modifying geometry
  | 'utility'        // Helper functions
  | 'io';            // Import/export operations

export type OpTag =
  | 'mesh'           // Operates on triangle meshes
  | 'nurbs'          // Operates on NURBS curves/surfaces
  | 'brep'           // Operates on boundary representations
  | 'polyline'       // Operates on polylines
  | 'curve'          // Operates on curves
  | 'surface'        // Operates on surfaces
  | 'math'           // Mathematical operations
  | '2d'             // 2D operations
  | '3d';            // 3D operations

export type Complexity =
  | 'O(1)'           // Constant time
  | 'O(log n)'       // Logarithmic
  | 'O(n)'           // Linear
  | 'O(n log n)'     // Linearithmic
  | 'O(n^2)'         // Quadratic
  | 'O(n^3)'         // Cubic
  | 'O(?)'           // Unknown/complex
  | 'varies';        // Depends on parameters

/**
 * Metadata for a geometry operation
 */
export interface GeometryOpMeta {
  /** Stable, unique identifier (e.g. "mesh.generateBox") */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Broad category */
  category: OpCategory;
  
  /** Fine-grained semantic tags */
  tags: OpTag[];
  
  /** Brief description of what the operation does */
  summary?: string;
  
  /** Time/space complexity (informational) */
  complexity?: Complexity;
  
  /** IDs of operations this depends on (for dependency graph) */
  deps?: string[];
  
  /** Version when this operation was introduced (for API stability) */
  since?: string;
  
  /** Whether this operation is stable (false = experimental) */
  stable?: boolean;
}

/**
 * A geometry operation function with attached metadata
 */
export type GeometryOpFn<TFn extends (...args: any[]) => any> =
  TFn & { meta: GeometryOpMeta };

/**
 * Defines a geometry operation with semantic metadata
 * 
 * @param meta - Semantic metadata for the operation
 * @param fn - The operation function
 * @returns The function with attached metadata
 * 
 * @example
 * ```ts
 * export const generateBoxMesh = defineOp(
 *   {
 *     id: 'mesh.generateBox',
 *     name: 'Generate Box Mesh',
 *     category: 'primitive',
 *     tags: ['mesh', '3d'],
 *     complexity: 'O(n)',
 *     summary: 'Creates a box mesh with specified dimensions'
 *   },
 *   function generateBoxMesh(size, segments?) {
 *     // implementation...
 *   }
 * );
 * ```
 */
export function defineOp<TFn extends (...args: any[]) => any>(
  meta: GeometryOpMeta,
  fn: TFn
): GeometryOpFn<TFn> {
  // Attach metadata to function
  (fn as any).meta = meta;
  
  // Validate metadata in development
  if (process.env.NODE_ENV !== 'production') {
    if (!meta.id) throw new Error('Operation must have an id');
    if (!meta.name) throw new Error('Operation must have a name');
    if (!meta.category) throw new Error('Operation must have a category');
    if (!meta.tags || meta.tags.length === 0) {
      throw new Error('Operation must have at least one tag');
    }
  }
  
  return fn as GeometryOpFn<TFn>;
}

/**
 * Checks if a function is a defined geometry operation
 */
export function isGeometryOp(fn: any): fn is GeometryOpFn<any> {
  return typeof fn === 'function' && 'meta' in fn && typeof fn.meta === 'object';
}
