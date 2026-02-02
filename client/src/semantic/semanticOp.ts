/**
 * Semantic metadata for all operations (geometry, math, vector, logic, data, etc.)
 * 
 * This module defines the semantic layer for ALL kernel operations,
 * enabling formal linkage between nodes and operations, validation,
 * documentation generation, and future UI features.
 * 
 * This is a generalization of the geometry-specific semantic system to support
 * log-scale growth across all operation domains.
 */

/**
 * Domain of an operation
 */
export type SemanticDomain =
  | 'geometry'      // Geometry kernel operations (mesh, NURBS, BRep, etc.)
  | 'math'          // Mathematical operations (add, multiply, sqrt, etc.)
  | 'vector'        // Vector operations (dot, cross, normalize, etc.)
  | 'logic'         // Logic operations (and, or, not, compare, etc.)
  | 'data'          // Data operations (map, filter, flatten, etc.)
  | 'string'        // String operations (concat, split, etc.)
  | 'color'         // Color operations (hex↔rgb, blend, etc.)
  | 'solver'        // Solver operations (physics, chemistry, etc.)
  | 'workflow'      // Workflow operations (literal, identity, etc.)
  | 'command';      // Roslyn command operations (UI-triggered operations)

/**
 * Category of an operation (within its domain)
 */
export type OpCategory =
  | 'primitive'      // Generates new data from parameters
  | 'modifier'       // Modifies existing data
  | 'tessellation'   // Converts between representations
  | 'transform'      // Spatial/data transformations
  | 'analysis'       // Computes properties without modifying data
  | 'utility'        // Helper functions
  | 'io'             // Import/export operations
  | 'operator'       // Binary/unary operators (math, logic)
  | 'aggregation'    // Aggregates multiple values (sum, max, etc.)
  | 'control'        // Control flow (if, switch, etc.)
  | 'creation'       // Creates new geometry (command domain)
  | 'operation'      // Performs operations on geometry (command domain)
  | 'conversion'     // Converts between representations (command domain)
  | 'ui';            // UI/interaction operations (command domain)

/**
 * Tags for fine-grained semantic classification
 */
export type OpTag =
  // Geometry tags
  | 'mesh'           // Operates on triangle meshes
  | 'nurbs'          // Operates on NURBS curves/surfaces
  | 'brep'           // Operates on boundary representations
  | 'polyline'       // Operates on polylines
  | 'curve'          // Operates on curves
  | 'surface'        // Operates on surfaces
  | '2d'             // 2D operations
  | '3d'             // 3D operations
  // Math tags
  | 'math'           // General math operations
  | 'arithmetic'     // Basic arithmetic
  | 'trigonometry'   // Trig functions
  | 'exponential'    // Exponential/logarithmic
  | 'rounding'       // Rounding operations
  | 'comparison'     // Comparison operations
  // Vector tags
  | 'vector2'        // 2D vectors
  | 'vector3'        // 3D vectors
  | 'vector4'        // 4D vectors
  | 'matrix'         // Matrix operations
  | 'quaternion'     // Quaternion operations
  // Logic tags
  | 'boolean'        // Boolean logic
  | 'conditional'    // Conditional operations
  // Data tags
  | 'array'          // Array operations
  | 'collection'     // Collection operations
  | 'iteration'      // Iteration operations
  // String tags
  | 'text'           // Text operations
  | 'formatting'     // Formatting operations
  // Color tags
  | 'colorspace'     // Color space conversions
  | 'blending'       // Color blending
  // Command tags
  | 'geometry'       // Geometry operations
  | 'point'          // Point operations
  | 'vertex'         // Vertex operations
  | 'line'           // Line operations
  | 'polyline'       // Polyline operations
  | 'rectangle'      // Rectangle operations
  | 'polygon'        // Polygon operations
  | 'circle'         // Circle operations
  | 'arc'            // Arc operations
  | 'freeform'       // Freeform operations
  | 'primitive'      // Primitive operations
  | 'box'            // Box operations
  | 'sphere'         // Sphere operations
  | 'cylinder'       // Cylinder operations
  | 'csg'            // CSG operations
  | 'loft'           // Loft operations
  | 'fill'           // Fill operations
  | 'extrude'        // Extrude operations
  | 'solid'          // Solid operations
  | 'merge'          // Merge operations
  | 'flip'           // Flip operations
  | 'normals'        // Normal operations
  | 'thicken'        // Thicken operations
  | 'offset'         // Offset operations
  | 'interpolate'    // Interpolate operations
  | 'translate'      // Translate operations
  | 'rotate'         // Rotate operations
  | 'scale'          // Scale operations
  | 'mirror'         // Mirror operations
  | 'replicate'      // Replicate operations
  | 'gumball'        // Gumball operations
  | 'sculpt'         // Sculpt operations
  | 'deform'         // Deform operations
  | 'history'        // History operations
  | 'undo'           // Undo operations
  | 'redo'           // Redo operations
  | 'clipboard'      // Clipboard operations
  | 'copy'           // Copy operations
  | 'paste'          // Paste operations
  | 'duplicate'      // Duplicate operations
  | 'edit'           // Edit operations
  | 'delete'         // Delete operations
  | 'control'        // Control operations
  | 'cancel'         // Cancel operations
  | 'confirm'        // Confirm operations
  | 'widget'         // Widget operations
  | 'view'           // View operations
  | 'focus'          // Focus operations
  | 'frame'          // Frame operations
  | 'all'            // All operations
  | 'export'         // Export operations
  | 'screenshot'     // Screenshot operations
  | 'image'          // Image operations
  | 'camera'         // Camera operations
  | 'preset'         // Preset operations
  | 'settings'       // Settings operations
  | 'origin'         // Origin operations
  | 'orbit'          // Orbit operations
  | 'pan'            // Pan operations
  | 'zoom'           // Zoom operations
  | 'selection'      // Selection operations
  | 'filter'         // Filter operations
  | 'cycle'          // Cycle operations
  | 'snap'           // Snap operations
  | 'grid'           // Grid operations
  | 'precision'      // Precision operations
  | 'cplane'         // C-plane operations
  | 'construction'   // Construction operations
  | 'plane'          // Plane operations
  | 'display'        // Display operations
  | 'shading'        // Shading operations
  | 'wireframe'      // Wireframe operations
  | 'visibility'     // Visibility operations
  | 'isolate'        // Isolate operations
  | 'hide'           // Hide operations
  | 'outliner'       // Outliner operations
  | 'hierarchy'      // Hierarchy operations
  | 'layers'         // Layers operations
  | 'tolerance'      // Tolerance operations
  | 'help'           // Help operations
  | 'ui'             // UI operations
  | 'state'          // State operations
  // Analysis tags
  | 'analysis'       // Analysis operations
  | 'info'           // Info operations
  | 'metadata'       // Metadata operations
  | 'dimensions'     // Dimensions operations
  | 'size'           // Size operations
  | 'vertices'       // Vertices operations
  | 'points'         // Points operations
  | 'edges'          // Edges operations
  | 'curves'         // Curves operations
  | 'faces'          // Faces operations
  | 'normals-analysis' // Normals analysis
  | 'curvature'      // Curvature operations
  | 'area'           // Area operations
  | 'volume'         // Volume operations
  | 'centroid'       // Centroid operations
  // Wave tags
  | 'wave'           // Wave operations
  | 'oscillation'    // Oscillation operations
  | 'periodic'       // Periodic operations
  // Field tags
  | 'field'          // Field operations
  | 'spatial'        // Spatial operations
  // Array tags
  | 'linear'         // Linear operations
  | 'polar'          // Polar operations
  | 'pattern'        // Pattern operations
  // Primitive tags
  | 'platonic'       // Platonic solids
  | 'prism'          // Prism operations
  | 'parametric'     // Parametric operations
  | 'special'        // Special operations
  // General tags
  | 'pure'           // Pure function (no side effects)
  | 'deterministic'  // Deterministic (same input → same output)
  | 'allocation'     // Allocates memory
  | 'branching'      // Contains branching logic
  | 'io';            // Performs I/O

/**
 * Computational complexity
 */
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
 * Cost hint for operation (simplified complexity)
 */
export type CostHint = 'low' | 'medium' | 'high';

/**
 * Side effects an operation may have
 */
export type SideEffect =
  | 'io'             // File I/O
  | 'network'        // Network access
  | 'filesystem'     // Filesystem access
  | 'gpu'            // GPU computation
  | 'threading'      // Multi-threading
  | 'random'         // Uses randomness
  | 'time'           // Uses current time
  | 'state'          // Modifies application state
  | 'camera'         // Modifies camera state
  | 'ui'             // Modifies UI state
  | 'clipboard';     // Modifies clipboard

/**
 * Metadata for a semantic operation
 */
export interface SemanticOpMeta {
  /** Stable, unique identifier (e.g. "math.add", "mesh.generateBox") */
  id: string;
  
  /** Domain of the operation */
  domain: SemanticDomain;
  
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
  
  /** Simplified cost hint */
  cost?: CostHint;
  
  /** Whether this is a pure function (no side effects) */
  pure?: boolean;
  
  /** Whether this is deterministic (same input → same output) */
  deterministic?: boolean;
  
  /** Side effects this operation may have */
  sideEffects?: SideEffect[];
  
  /** IDs of operations this depends on (for dependency graph) */
  deps?: string[];
  
  /** Version when this operation was introduced (for API stability) */
  since?: string;
  
  /** Whether this operation is stable (false = experimental) */
  stable?: boolean;
}

/**
 * An operation function with attached metadata
 */
export type SemanticOpFn<TFn extends (...args: any[]) => any> =
  TFn & { meta: SemanticOpMeta };

/**
 * Defines a semantic operation with metadata
 * 
 * @param meta - Semantic metadata for the operation
 * @param fn - The operation function
 * @returns The function with attached metadata
 * 
 * @example
 * ```ts
 * export const add = defineSemanticOp(
 *   {
 *     id: 'math.add',
 *     domain: 'math',
 *     name: 'Add',
 *     category: 'operator',
 *     tags: ['arithmetic', 'pure', 'deterministic'],
 *     complexity: 'O(1)',
 *     cost: 'low',
 *     pure: true,
 *     deterministic: true,
 *     summary: 'Adds two numbers'
 *   },
 *   function add(a: number, b: number) {
 *     return a + b;
 *   }
 * );
 * ```
 */
export function defineSemanticOp<TFn extends (...args: any[]) => any>(
  meta: SemanticOpMeta,
  fn: TFn
): SemanticOpFn<TFn> {
  // Attach metadata to function
  (fn as any).meta = meta;
  
  // Validate metadata in development
  if (process.env.NODE_ENV !== 'production') {
    if (!meta.id) throw new Error('Operation must have an id');
    if (!meta.domain) throw new Error('Operation must have a domain');
    if (!meta.name) throw new Error('Operation must have a name');
    if (!meta.category) throw new Error('Operation must have a category');
    if (!meta.tags || meta.tags.length === 0) {
      throw new Error('Operation must have at least one tag');
    }
  }
  
  return fn as SemanticOpFn<TFn>;
}

/**
 * Checks if a function is a defined semantic operation
 */
export function isSemanticOp(fn: any): fn is SemanticOpFn<any> {
  return typeof fn === 'function' && 'meta' in fn && typeof fn.meta === 'object';
}

// Re-export for backward compatibility with geometry-specific code
export type GeometryOpMeta = SemanticOpMeta;
export type GeometryOpFn<TFn extends (...args: any[]) => any> = SemanticOpFn<TFn>;
export const defineOp = defineSemanticOp;
export const isGeometryOp = isSemanticOp;
