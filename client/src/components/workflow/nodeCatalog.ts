import type { NodeType } from "../../workflow/nodeTypes";
import {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  PORT_TYPE_COLOR,
  coerceValueToPortType,
  getDefaultParameters,
  getNodeDefinition,
  isPortTypeCompatible,
  resolveNodeParameters,
  resolveNodePorts,
  resolvePortByKey,
  type NodeCategory,
  type NodeCategoryId,
  type WorkflowNodeDefinition,
  type WorkflowParameterSpec,
  type WorkflowPortSpec,
  type WorkflowPortType,
  type WorkflowValue,
} from "../../workflow/nodeRegistry";

export {
  NODE_CATEGORIES,
  NODE_CATEGORY_BY_ID,
  NODE_DEFINITIONS,
  PORT_TYPE_COLOR,
  coerceValueToPortType,
  getDefaultParameters,
  getNodeDefinition,
  isPortTypeCompatible,
  resolveNodeParameters,
  resolveNodePorts,
  resolvePortByKey,
  type NodeCategory,
  type NodeCategoryId,
  type WorkflowNodeDefinition as NodeDefinition,
  type WorkflowParameterSpec,
  type WorkflowPortSpec,
  type WorkflowPortType,
  type WorkflowValue,
};

/**
 * Comprehensive implementation notes for all Numerica workflow nodes.
 * These notes provide detailed usage guidance displayed in documentation pages.
 */
const NODE_IMPLEMENTATION_NOTES: Partial<Record<NodeType, string>> = {
  // === DATA & UI NODES ===
  geometryReference: "References existing Roslyn geometry into the graph. Select geometry in Roslyn, then connect this node to include it in your workflow. Changes to referenced geometry automatically propagate through the graph. Use for parametric variations on modeled forms.",
  text: "Floating handwritten-style text annotation on the canvas. Double-click to edit content. Use for labeling workflow sections, adding notes, or documenting node purposes. Text does not affect data flow.",
  group: "Visual container that organizes related nodes. Drag nodes into the group or draw the group around them. Double-click the title bar to rename. Groups help manage complex workflows by creating logical sections. Groups can be collapsed to save space.",
  panel: "Read-only display panel for inspecting upstream data values. Connects to any output port and shows the current value as formatted text. Shows lists with indices, vectors as components. When disconnected, displays fallback text you can edit. Great for debugging data flow.",
  textNote: "Freeform annotation that can both display and pass through data. Connect inputs to see their values while adding your own notes. Data flows through unchanged. Use for documenting intermediate values or adding context to complex calculations.",
  slider: "Interactive slider control that outputs a numeric value. Drag the handle or click to set values within min/max range. Step parameter controls increment precision. Connect to parameter inputs for real-time adjustments. Essential for parametric exploration and tuning.",
  colorPicker: "Color selection swatch that outputs both RGB vector {x,y,z} and hexadecimal string. Click to open color picker. RGB values range 0-1 for direct use in materials. Hex output useful for CSS or external tools. Connect to Custom Material for geometry coloring.",
  customMaterial: "Applies a render-only color to geometry for visualization. Does not affect geometry data, only display appearance. Connect geometry input and color from Color Picker or Vector. Output geometry retains the color metadata for Roslyn display.",

  // === PREVIEW & VIEWER NODES ===
  geometryViewer: "Embedded mini viewport that displays connected geometry. Rotate, pan, and zoom within the thumbnail. Accepts optional Filter input for custom display modes. Outputs detected file type string. Perfect for previewing intermediate geometry without cluttering main Roslyn view.",
  customPreview: "Preview node that combines geometry with a Filter for styled display. Connect geometry and a Preview Filter node. Geometry passes through unchanged while displaying with filter settings applied. Chain multiple previews for comparing display modes.",
  previewFilter: "Generates display filter settings for Custom Preview and Geometry Viewer nodes. Configure display mode (shaded, wireframe, ghosted), solidity, sheen, and culling options. Output connects to Filter inputs. Create multiple filters for comparing visualization styles.",
  metadataPanel: "Inspects and displays geometry metadata attributes. Shows vertex count, face count, bounding box, surface area, volume (for closed meshes), and custom metadata. Useful for validation, documentation, or conditional logic based on geometry properties.",
  annotations: "Creates 3D text annotations anchored to geometry or points in Roslyn. Specify anchor position, text content, and size. Annotations appear in the Roslyn viewport as floating labels. Great for dimensioning, labeling features, or adding construction notes.",
  dimensions: "Displays live bounding box dimensions of connected geometry in Roslyn. Shows width, depth, and height measurements that update automatically. Essential for verifying sizes during parametric design. Dimensions appear as overlay graphics.",

  // === MESH CONVERSION NODES ===
  meshConvert: "Universal geometry-to-mesh converter. Handles NURBS curves (creates pipe mesh), NURBS surfaces (tessellates), B-Rep (tessellates faces), and vertex geometry (creates spheres at points). Thickness parameter controls pipe/sphere radius. Direction overrides extrusion vector.",
  nurbsToMesh: "Converts NURBS curves and surfaces to mesh geometry. Curves become pipe meshes with specified thickness. Surfaces are tessellated to triangles. Capped option closes pipe ends. Essential bridge between precise NURBS modeling and mesh-based operations.",
  brepToMesh: "Tessellates B-Rep (Boundary Representation) solids into triangle meshes. Mesh density controlled by tessellation settings. Preserves face boundaries where possible. Required before mesh editing operations or export to mesh formats like STL.",
  meshToBrep: "Converts mesh geometry to B-Rep solid representation. Each triangle becomes a planar B-Rep face. Enables Boolean operations and topology-aware editing on imported meshes. Note: creates triangle soup, not smooth surfaces.",

  // === MESH EDITING NODES ===
  subdivideMesh: "Increases mesh resolution through subdivision. Methods: Linear (splits faces without smoothing), Catmull-Clark (smooth quads), Loop (smooth triangles), Adaptive (based on curvature). Iterations control subdivision depth. Higher iterations = smoother but more triangles.",
  dualMesh: "Converts mesh to its topological dual. Face centers become vertices, vertex positions become faces. Triangular meshes become hexagonal patterns. Interesting for creating Voronoi-like surface patterns from regular meshes.",
  insetFaces: "Shrinks selected mesh faces inward, creating a border ring of new faces. Inset amount controls shrinkage distance. Use for creating panel patterns, preparing faces for extrusion, or decorative surface details.",
  extrudeFaces: "Pulls selected mesh faces outward (or inward with negative values) along face normals. Creates new side faces connecting to original position. Cap parameter adds faces at the extrusion end. Core operation for mesh modeling.",
  meshRelax: "Smooths mesh by averaging vertex positions with neighbors. Iterations control smoothing intensity. Keep boundary option preserves edge vertices. Use for organic smoothing, reducing noise, or blending mesh modifications.",
  selectFaces: "Filters mesh faces based on normal direction and threshold angle. Returns submesh of matching faces. Use to select upward-facing, vertical, or custom-angled face sets for subsequent operations.",
  meshBoolean: "Performs Boolean operations (Union, Difference, Intersection) on meshes. Both inputs must be closed watertight meshes. Union combines, Difference subtracts B from A, Intersection keeps overlap. Essential for constructive solid modeling with meshes.",
  triangulateMesh: "Converts all mesh faces to triangles. Quads and n-gons are split. Required for many mesh operations and export formats. Preserves geometry while ensuring triangular topology throughout.",
  meshRepair: "Automatically fixes common mesh problems: removes degenerate faces, fills small holes, removes duplicate vertices, fixes normal orientation. Run after imports or complex operations to ensure mesh validity.",
  meshUVs: "Generates UV texture coordinates for mesh surfaces. Methods: Planar (projection), Box (6-sided projection), Cylindrical, Spherical. Proper UVs required for texturing. Scale and offset parameters adjust mapping.",
  meshDecimate: "Reduces mesh triangle count while preserving shape. Target ratio or triangle count controls reduction level. Preserves boundary edges and feature angles. Use to optimize heavy meshes for performance.",
  quadRemesh: "Converts triangle mesh to quad-dominant topology. Target face count controls density. Better for subdivision, animation, and manual editing. Creates cleaner edge flow than triangles.",

  // === TESSELLATION & PATTERNS ===
  geodesicSphere: "Creates geodesic sphere meshes by subdividing icosahedron. Frequency parameter controls subdivision level. Results in evenly-distributed vertices. Excellent for domes, planets, or sphere-based deformations.",
  voronoiPattern: "Generates 3D Voronoi cell patterns from point cloud or mesh vertices. Cell boundaries create organic-looking divisions. Use for natural patterns, foam structures, or cellular designs.",
  hexagonalTiling: "Creates hexagonal tile pattern on surfaces. Size controls hexagon radius, count controls pattern extent. Excellent for honeycomb structures, flooring patterns, or hex-based grids.",
  offsetPattern: "Offsets pattern edges inward to create gaps between elements. Frame width controls offset amount. Transforms solid patterns into framed/outlined versions. Great for lattice structures.",

  // === IMPORT/EXPORT NODES ===
  stlImport: "Imports STL mesh files into the workflow. Supports both ASCII and binary STL formats. Imported meshes connect to downstream mesh operations. Use for bringing in 3D scans, downloaded models, or external CAD exports.",
  stlExport: "Exports mesh geometry to STL file format. Choose ASCII or binary format. STL is universal format for 3D printing. Outputs file path string. Connect to download node or file system operations.",

  // === PRIMITIVE GEOMETRY NODES ===
  point: "Creates a point at specified XYZ coordinates. Points serve as construction references, attractor centers, or curve control vertices. Connect to Point Cloud or use as input for distance/proximity calculations.",
  pointCloud: "Creates a collection of points from lists of coordinates. Input can be list of vectors or separate X,Y,Z component lists. Point clouds useful for sampling, distribution analysis, or scattering operations.",
  line: "Creates a line segment between start and end points. Outputs line geometry and length value. Lines can be used for measurements, construction guides, or as sweep paths. Connect endpoints from other geometry for dynamic lines.",
  rectangle: "Creates a rectangular polyline on a plane. Specify width, height, and center point. Output is a closed 4-vertex polyline. Use as extrusion profile, trim boundary, or pattern base. Plane parameter orients the rectangle.",
  circle: "Creates a circular curve on a plane. Specify center and radius. Outputs closed NURBS circle with perfect curvature. Use for profiles, trim boundaries, or as base for cylindrical operations.",
  arc: "Creates a circular arc from start angle to end angle. Specify center, radius, and angular extent. Output is an open curve segment. Use for partial circles, cam profiles, or architectural details.",
  curve: "Creates a NURBS curve through specified control points. Degree parameter controls smoothness (2=quadratic, 3=cubic). Higher degree = smoother curve. Essential for organic paths, railings, or sweep guides.",
  polyline: "Creates a polyline through a list of points. Points are connected in order with straight segments. Closed parameter connects last point to first. Use for profiles, paths, or construction geometry.",
  surface: "Creates a surface from boundary curves. Input closed curve generates planar surface. Multiple curves attempt lofted or patched surface. Output is NURBS surface geometry for further operations.",
  loft: "Creates a surface by lofting between profile curves. Curves are connected in sequence to form a skin surface. Order matters - ensure consistent direction. Options control tangent continuity at profiles.",
  extrude: "Extrudes curves or surfaces along a direction vector. Distance parameter sets extrusion length. Cap option closes ends for solid output. Fundamental for converting 2D profiles to 3D forms.",
  pipeSweep: "Creates a pipe mesh by sweeping a circular profile along a curve path. Radius controls pipe thickness, segments control smoothness. Essential for tubes, wires, railings, or rounded edges.",
  pipeMerge: "Combines multiple pipe segments at junctions with smooth blending. Automatically handles branch connections. Use after creating individual pipes to create clean, joined tube networks.",

  // === BOOLEAN & MODIFIERS ===
  boolean: "Performs CSG Boolean operations on solid geometry. Union combines volumes, Difference subtracts, Intersection keeps only overlap. Both inputs must be closed solids. Fundamental for constructive modeling.",
  offset: "Offsets curves by a perpendicular distance. Positive values offset outward (based on curve direction), negative inward. Self-intersections are handled. Use for wall thickness, margins, or concentric patterns.",
  fillet: "Applies rounded corners to polylines at vertices. Radius parameter controls fillet size. Rebuilds the curve with arc segments replacing sharp corners. Essential for smoothing mechanical profiles.",
  filletEdges: "Bevels selected mesh edges with new faces. Width controls bevel distance, segments control smoothness. Creates chamfered or rounded edge appearance. Use for softening hard edges on mesh models.",
  offsetSurface: "Offsets surface geometry along normals by a distance. Creates a parallel surface shell. Direction controls offset side. Use for creating thickness from single surfaces.",
  thickenMesh: "Adds thickness to mesh surfaces by offsetting along normals and stitching boundaries. Creates solid shells from surface meshes. Distance parameter controls thickness. Essential for 3D printing thin surfaces.",
  plasticwrap: "Projects mesh vertices toward a target surface using raycasting. Creates shrink-wrap effect. Blend controls projection strength. Use for conforming meshes to target shapes or creating packaging effects.",
  solid: "Attempts to create a closed solid from mesh geometry. Caps boundary loops and ensures consistent normal orientation. Falls back to double-sided rendering for already-closed meshes.",
  primitive: "Generic primitive node with selectable shape type. Choose from box, sphere, cylinder, etc. from dropdown. Parameters adapt to selected type. Convenient for quick primitive exploration.",
  box: "Creates a box mesh with specified dimensions. Width, depth, height control size. Center point sets position. Outputs axis-aligned box geometry. Fundamental primitive for architectural and mechanical modeling.",
  sphere: "Creates a sphere mesh with specified radius and detail level. Segments control mesh density. Outputs triangulated sphere approximation. Use for balls, planets, or spherical approximations.",

  // === VOXEL OPERATIONS ===
  voxelizeGeometry: "Converts geometry to voxel grid representation. Resolution controls voxel size. Surface mode creates shell, solid mode fills interior. Output is 3D density grid for volume operations.",
  extractIsosurface: "Generates mesh surface from voxel density field at specified iso value. Marching cubes algorithm creates smooth surface at density threshold. Use to visualize voxel fields or convert volume data to mesh.",

  // === SOLVER NODES ===
  topologyOptimize: "Configures topology optimization parameters. Connect to Topology Solver with geometry and goals. Settings include volume fraction, penalty factor, filter radius. Monitor convergence in solver popup.",
  topologySolver: "Runs density-based topology optimization on a voxel domain. Iteratively removes material while satisfying structural goals. Input base geometry, constraints, and loads. Outputs optimized density field.",
  biologicalSolver: "Evolutionary optimization using biological metaphors. Genomes encode design parameters, fitness evaluates performance. Iterates through mutation and selection. Returns best genome and fitness history.",
  biologicalEvolutionSolver: "Full-featured biological evolution solver with interactive popup UI. Connect Genome, Phenotype, and Fitness nodes. Watch evolution progress in real-time. Export best designs.",
  physicsSolver: "Structural analysis and optimization solver. Connect mesh geometry with Load and Anchor goals. Calculates stress, strain, and displacement. Outputs analysis results and optimized forms.",
  voxelSolver: "Wrapper for voxel-based topology optimization. Simplified interface to topologySolver with cleaner parameter organization. Outputs optimized voxel field and extracted surface.",
  chemistrySolver: "Multi-material optimization using particle-based simulation. Define materials with Chemistry Material Goal nodes. Solver distributes materials to optimize combined objectives. Outputs material field and preview mesh.",

  // === GOAL NODES (PHYSICS) ===
  stiffnessGoal: "Defines stiffness targets for structural optimization. Weight controls goal importance. Higher stiffness goals drive material toward load paths. Connect to Physics Solver or Topology Solver.",
  volumeGoal: "Constrains total material volume in optimization. Target fraction (0-1) sets material budget. Optimizer removes material while respecting constraints. Essential for lightweight design.",
  loadGoal: "Applies external forces to structure for analysis. Specify force vector and application region. Multiple loads can be combined. Solver calculates structural response to loading.",
  anchorGoal: "Defines fixed boundary conditions (supports). Anchored regions cannot move during analysis. Essential for realistic structural simulation. Specify anchor points or geometry regions.",

  // === GOAL NODES (BIOLOGICAL EVOLUTION) ===
  genomeCollector: "Collects slider nodes as genes for biological evolution. Connected sliders become the evolvable parameters. Gene values are encoded in genome arrays. Essential input for Biological Evolution Solver.",
  geometryPhenotype: "Captures geometry outputs as the phenotype (physical expression) of genomes. Connect final geometry outputs. Phenotype is evaluated by fitness functions. Multiple outputs create multi-objective optimization.",
  performsFitness: "Aggregates numeric metrics into weighted fitness score. Connect measurement outputs with weights. Higher fitness = better design. Fitness drives evolutionary selection pressure.",

  // === GOAL NODES (BIOLOGICAL GROWTH) ===
  growthGoal: "Promotes biomass accumulation in biological growth simulations. Intensity controls growth rate, direction biases growth vector. Use for simulating plant growth, coral formation, or organic structures.",
  nutrientGoal: "Defines nutrient source for biological growth. Position sets source location, strength controls availability, diffusion sets spread rate. Growth occurs toward nutrient sources.",
  morphogenesisGoal: "Shapes branching patterns in biological growth. Density controls branch frequency, scale affects pattern size. Creates natural-looking branching like trees, veins, or lightning.",
  homeostasisGoal: "Maintains stability during biological growth. Penalizes excessive stress or rapid changes. Creates more conservative, stable growth patterns. Balance with growth goals for controlled expansion.",

  // === GOAL NODES (CHEMISTRY/MATERIALS) ===
  chemistryStiffnessGoal: "Biases stiff materials toward stress-aligned regions. Chemistry solver places high-stiffness materials where needed structurally. Weight controls influence relative to other goals.",
  chemistryMassGoal: "Minimizes total material mass in chemistry optimization. Drives solver toward lighter material distributions. Balance with stiffness for efficient structures.",
  chemistryBlendGoal: "Enforces smooth material gradients. Prevents sharp material boundaries. Creates natural diffusion between material regions. Important for manufacturable multi-material designs.",
  chemistryMaterialGoal: "Assigns specific material species to geometry regions. Connect geometry and select from material library. Solver respects material assignments as constraints or starting conditions.",
  chemistryTransparencyGoal: "Optimizes for optical transmission. Biases transparent materials toward regions requiring light passage. Use for windows, lenses, or light guides in multi-material optimization.",
  chemistryThermalGoal: "Optimizes thermal conductivity distribution. Place conductive materials for heat paths, insulating materials for barriers. Use for heat sinks, thermal management, or insulation design.",

  // === VECTOR OPERATIONS ===
  origin: "Outputs the origin point (0,0,0) as a vector constant. Use as reference point for constructions, measurements, or as default position. Convenient constant node for common reference.",
  unitX: "Outputs the unit X vector (1,0,0). Use for X-axis direction, as move vector, or for dot product calculations. Standard basis vector constant.",
  unitY: "Outputs the unit Y vector (0,1,0). Use for Y-axis direction, vertical reference, or as extrusion direction. Standard basis vector constant.",
  unitZ: "Outputs the unit Z vector (0,0,1). Use for Z-axis direction, up vector, or depth direction. Standard basis vector constant.",
  unitXYZ: "Outputs the diagonal unit vector (1,1,1) normalized. Points equally toward all positive axes. Useful for uniform scaling vectors or diagonal directions.",
  moveVector: "Creates a movement vector from X, Y, Z components. Output can connect to Move node direction input. Convenience node for building translation vectors from separate coordinates.",
  scaleVector: "Creates a scale vector from X, Y, Z factors. Output connects to Scale node. Allows non-uniform scaling with different factors per axis.",
  vectorConstruct: "Builds a vector from individual X, Y, Z number inputs. Essential for combining separate numeric streams into vector data. Inverse of Vector Deconstruct.",
  vectorDeconstruct: "Splits a vector into individual X, Y, Z number outputs. Essential for working with vector components separately. Inverse of Vector Construct.",
  vectorAdd: "Adds two vectors component-wise. (A.x+B.x, A.y+B.y, A.z+B.z). Use for combining translations, accumulating forces, or blending positions.",
  vectorSubtract: "Subtracts vector B from vector A. Result points from B to A. Use for calculating directions between points or finding differences.",
  vectorScale: "Multiplies vector by a scalar value. Scales magnitude without changing direction. Use for adjusting force strength, speed factors, or distance multipliers.",
  vectorLength: "Calculates the magnitude (length) of a vector. Returns single number. Use for distance calculations, normalization checks, or threshold comparisons.",
  vectorNormalize: "Scales vector to unit length (magnitude = 1). Preserves direction, standardizes magnitude. Essential before direction comparisons or consistent movement speeds.",
  vectorDot: "Calculates dot product of two vectors. Returns scalar indicating alignment (-1 to 1 for unit vectors). Use for angle calculations, projection amounts, or facing detection.",
  vectorCross: "Calculates cross product of two vectors. Returns vector perpendicular to both inputs. Essential for calculating normals, rotation axes, or perpendicular directions.",
  distance: "Calculates distance between two points (vectors). Returns single number. Convenience node combining subtraction and length. Use for proximity checks or spacing calculations.",
  vectorFromPoints: "Creates a direction vector from start point to end point. Output points from A toward B. Length equals distance between points. Use for aiming or direction finding.",
  vectorAngle: "Calculates angle between two vectors in degrees. Returns 0-180 range. Use for bend angles, opening angles, or orientation comparisons.",
  vectorLerp: "Linear interpolation between two vectors. Factor 0 returns A, factor 1 returns B, 0.5 returns midpoint. Use for blending positions, smooth transitions, or parametric paths.",
  vectorProject: "Projects vector A onto vector B. Returns component of A in B's direction. Use for finding parallel components, shadow lengths, or decomposing motion.",
  pointAttractor: "Creates attraction/repulsion field from a point. Strength controls intensity, falloff controls distance decay. Use for organic deformations, particle effects, or field-based modeling.",

  // === MATH OPERATIONS ===
  number: "Outputs a constant numeric value. Use for fixed parameters, magic numbers, or named constants. Connect to any number input. Edit value in node parameters.",
  add: "Adds two numbers. Basic arithmetic building block. Use for accumulating values, offsets, or combining measurements.",
  subtract: "Subtracts B from A. Returns A - B. Use for differences, decrements, or relative values.",
  multiply: "Multiplies two numbers. Use for scaling, area calculations, or applying factors.",
  divide: "Divides A by B. Returns A / B. Handles division by zero gracefully. Use for ratios, averaging, or unit conversions.",
  clamp: "Constrains a value between minimum and maximum bounds. Values below min become min, above max become max. Essential for keeping values in valid ranges.",
  min: "Returns the smaller of two values. Use for upper bounds, limiting maximums, or taking conservative estimates.",
  max: "Returns the larger of two values. Use for lower bounds, ensuring minimums, or taking aggressive estimates.",
  expression: "Evaluates mathematical expressions with variables. Supports standard operators (+,-,*,/,^), functions (sin, cos, sqrt, etc.), and named variables from inputs. Powerful for complex formulas.",
  scalarFunctions: "Collection of common scalar math functions. Select function from dropdown: abs, floor, ceil, round, sqrt, sin, cos, tan, log, exp, etc. Single input, single output.",
  conditional: "If-then-else logic for numbers. Condition input (boolean or number) selects between True and False outputs. Use for switching between values, clamping, or mode selection.",

  // === LIST OPERATIONS ===
  listCreate: "Creates a list from individual inputs. Connect multiple values to input ports. Output is ordered list. Fundamental for collecting items before list operations.",
  listLength: "Returns the number of items in a list. Use for loop counts, validation, or conditional logic based on collection size.",
  listItem: "Extracts a single item from a list by index. Index 0 is first item. Negative indices count from end. Use for accessing specific elements.",
  listIndexOf: "Finds the index of an item in a list. Returns -1 if not found. Use for searching, membership testing, or finding positions.",
  listPartition: "Splits a list into chunks of specified size. Returns list of lists. Use for batching, grouping, or creating matrix structures.",
  listFlatten: "Flattens nested lists into a single-level list. Depth parameter controls how many levels to flatten. Use for combining grouped results.",
  listSlice: "Extracts a portion of a list from start to end index. Supports negative indices. Use for taking subsets, trimming, or windowing operations.",
  listReverse: "Reverses the order of items in a list. First becomes last. Use for reversing sequences, curves, or iteration order.",
  listSum: "Adds all numeric values in a list. Returns single total. Use for totaling measurements, aggregating scores, or combining quantities.",
  listAverage: "Calculates arithmetic mean of numeric list. Sum divided by count. Use for center values, typical measurements, or smoothing.",
  listMin: "Returns the minimum value from a numeric list. Use for finding bounds, worst cases, or threshold detection.",
  listMax: "Returns the maximum value from a numeric list. Use for finding bounds, best cases, or peak detection.",
  listMedian: "Returns the middle value when list is sorted. More robust to outliers than average. Use for typical values in noisy data.",
  listStdDev: "Calculates standard deviation of numeric list. Measures spread from mean. Use for variability analysis or quality control.",

  // === GEOMETRY ANALYSIS ===
  geometryInfo: "Extracts comprehensive information about geometry. Outputs vertex count, face count, edge count, bounding box, center point, surface area, and volume (for closed meshes). Essential for documentation and validation.",
  measurement: "Measures geometric properties: distances, angles, areas, volumes. Connect geometry and select measurement type. Outputs numeric values for downstream calculations.",
  geometryVertices: "Extracts all vertices from geometry as point list. Works on meshes, curves, and surfaces. Use for point-based operations or analysis.",
  geometryEdges: "Extracts edges from geometry as line list. Each edge becomes a line segment. Use for wireframe operations or edge analysis.",
  geometryFaces: "Extracts faces from mesh geometry as individual surfaces or polygons. Use for per-face operations or face filtering.",
  geometryNormals: "Extracts normal vectors from geometry. For meshes, returns face or vertex normals. For surfaces, evaluates surface normals. Use for orientation analysis or offset directions.",
  geometryControlPoints: "Extracts NURBS control points as point list. Only works on NURBS curves and surfaces. Use for direct control point manipulation.",

  // === PROXIMITY & SPATIAL ===
  proximity3d: "Finds nearest geometry/point in 3D space. Input geometry and test point. Outputs closest point, distance, and index. Use for snapping, collision detection, or nearest neighbor queries.",
  proximity2d: "Projects to 2D and finds nearest geometry/point. Works on XY plane. Faster than 3D for planar problems. Outputs closest point and distance in 2D.",
  curveProximity: "Finds closest point on a curve to a test point. Outputs closest curve point, curve parameter (t), and distance. Use for curve snapping or projection operations.",

  // === RANGE & SEQUENCE ===
  range: "Generates a list of numbers from start to end with specified count. Includes both endpoints. Use for parameter sweeps, sampling points, or iteration indices.",
  linspace: "Creates linearly spaced values between start and end. Specify number of samples. Includes endpoints. Similar to range but defines count instead of step.",
  remap: "Remaps a value from one range to another. Input value in [oldMin, oldMax] outputs in [newMin, newMax]. Essential for normalizing or scaling values between different systems.",
  random: "Generates random numbers. Uniform distribution between min and max. Seed parameter for reproducible sequences. Use for variation, noise, or stochastic processes.",
  repeat: "Repeats a value or pattern multiple times. Creates list of repeated elements. Use for array filling, pattern creation, or generating constant lists.",

  // === ARRAY OPERATIONS ===
  linearArray: "Creates copies arranged along a linear direction. Specify count and spacing vector. Use for rows, columns, stairs, or any regular linear pattern.",
  polarArray: "Creates copies arranged in a circular pattern. Specify count, center, axis, and angular extent. Use for radial patterns, gears, wheel spokes, or rotational symmetry.",
  gridArray: "Creates copies arranged in a 2D or 3D grid. Specify counts and spacing for each axis. Use for matrices, waffle structures, or regular 3D lattices.",
  geometryArray: "Applies array transformation to geometry. Combines geometry input with array parameters. Outputs list of transformed geometry instances.",

  // === SIGNAL & WAVE ===
  sineWave: "Generates sine wave value from input parameter. Amplitude, frequency, and phase controls. Use for smooth oscillations, animations, or periodic variations. Output cycles between -amplitude and +amplitude.",
  cosineWave: "Generates cosine wave (sine shifted by 90°). Same parameters as sine. Use when you need to start at peak instead of zero. Often paired with sine for circular motion.",
  sawtoothWave: "Generates sawtooth wave (linear ramp that resets). Creates rising or falling ramps. Use for linear sweeps, progress indicators, or asymmetric oscillations.",
  triangleWave: "Generates triangle wave (linear up then down). Symmetric zigzag pattern. Use for ping-pong animations, symmetric oscillations, or linear interpolation cycles.",
  squareWave: "Generates square wave (alternating high/low). Digital on/off pattern. Use for pulse patterns, binary alternation, or stepped rhythms. Duty cycle controls high/low ratio.",

  // === TRANSFORM NODES ===
  move: "Translates geometry by a vector displacement. Input geometry and translation vector. Output is moved copy. Preserves all geometry properties, only changes position.",
  rotate: "Rotates geometry around an axis by an angle. Specify rotation center, axis direction, and angle in degrees. Use for orientating, spinning, or angular positioning.",
  scale: "Scales geometry from a center point. Uniform or non-uniform scaling with separate XYZ factors. Use for resizing, stretching, or proportional adjustments.",
  fieldTransformation: "Deforms geometry using vector or scalar fields. Points are displaced based on field values at their locations. Falloff controls effect range. Use for organic deformations or field-driven design.",
  movePoint: "Moves a single point by specified XYZ offsets. Simple point translation. Output is displaced point. Use for adjusting individual coordinates.",
  movePointByVector: "Moves a point by a vector displacement. Same as move but specifically for point geometry. Clearer intent when working with points.",
  rotateVectorAxis: "Rotates a vector around an arbitrary axis. Specify axis direction and angle. Use for redirecting vectors, spinning normals, or orbital motion.",
  mirrorVector: "Reflects a vector across a plane defined by normal. Use for bouncing, reflection calculations, or symmetric transformations.",
};

const formatPortLabel = (port: WorkflowPortSpec) => {
  const label = port.label?.trim() || port.key;
  return `${label} (${port.type})`;
};

const formatPortSummary = (
  ports: WorkflowPortSpec[] | undefined,
  label: string,
  maxItems = 3
) => {
  if (!ports || ports.length === 0) return null;
  const entries = ports.map(formatPortLabel);
  const shown = entries.slice(0, maxItems);
  const remaining = entries.length - shown.length;
  const summary =
    remaining > 0 ? `${shown.join(", ")}, +${remaining} more` : shown.join(", ");
  return `${label}: ${summary}`;
};

export const buildNodeTooltipLines = (
  definition?: WorkflowNodeDefinition,
  ports?: { inputs: WorkflowPortSpec[]; outputs: WorkflowPortSpec[] }
) => {
  if (!definition) return [];
  const lines: string[] = [];
  const display = definition.display;
  if (display?.nameEnglish) {
    const romanization = display.romanization ? ` (${display.romanization})` : "";
    lines.push(`${display.nameEnglish}${romanization}`);
  } else if (display?.romanization) {
    lines.push(`(${display.romanization})`);
  }
  if (definition.description) {
    lines.push(definition.description);
  }
  const note = NODE_IMPLEMENTATION_NOTES[definition.type];
  if (note) {
    lines.push(note);
  }
  const inputLine = formatPortSummary(ports?.inputs, "Inputs");
  const outputLine = formatPortSummary(ports?.outputs, "Outputs");
  if (inputLine) lines.push(inputLine);
  if (outputLine) lines.push(outputLine);
  return lines;
};

export const resolveNodeDescription = (definition: WorkflowNodeDefinition) =>
  definition.description?.trim().length
    ? definition.description
    : NODE_IMPLEMENTATION_NOTES[definition.type] ?? "Description pending.";

export const getDefaultNodePorts = (definition: WorkflowNodeDefinition) => {
  try {
    const parameters = getDefaultParameters(definition.type);
    return resolveNodePorts(
      { type: definition.type, data: { label: definition.label } },
      parameters
    );
  } catch (error) {
    console.warn("Failed to resolve default ports for documentation", definition.type, error);
    return { inputs: [], outputs: [] };
  }
};
