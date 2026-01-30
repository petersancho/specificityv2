/**
 * Extended documentation content for Roslyn commands and Numerica nodes.
 * This file provides detailed usage tips, examples, common pitfalls, and related items.
 */

export type CommandDocumentation = {
  tips?: string[];
  examples?: string[];
  pitfalls?: string[];
  relatedCommands?: string[];
  workflowNotes?: string;
};

export type NodeDocumentation = {
  tips?: string[];
  examples?: string[];
  pitfalls?: string[];
  relatedNodes?: string[];
  workflowNotes?: string;
  bestPractices?: string[];
};

/**
 * Extended documentation for Roslyn commands.
 * Each entry provides tips, examples, pitfalls, and related commands.
 */
export const COMMAND_DOCUMENTATION: Record<string, CommandDocumentation> = {
  // === GEOMETRY CREATION ===
  point: {
    tips: [
      "Enable vertex snap to place points exactly on existing geometry",
      "Points are invisible in rendered views but visible in wireframe and editing modes",
      "Use points as construction guides before creating curves through them",
      "Multiple points can be selected and used as input for the Curve command",
    ],
    examples: [
      "Create reference points for a lofted surface by placing points at key profile locations",
      "Mark positions for array operations by placing guide points first",
      "Use points as attractors in Numerica for field-based deformations",
    ],
    pitfalls: [
      "Points don't render in final output - use small spheres if visible markers are needed",
      "Snapping to points requires 'Vertex' snap to be enabled",
    ],
    relatedCommands: ["polyline", "curve", "pointCloud"],
  },
  line: {
    tips: [
      "Hold Shift to constrain lines to orthogonal directions (0°, 90°, etc.)",
      "Type exact coordinates in the command line: '10,20,0' for a specific endpoint",
      "Chain multiple line segments by clicking without confirming",
      "Double-click to finish the line sequence",
    ],
    examples: [
      "Create a construction grid by drawing orthogonal lines at regular intervals",
      "Draw the profile of a bracket, then extrude to create 3D geometry",
      "Connect existing points to create a wireframe structure",
    ],
    pitfalls: [
      "Lines are individual segments - use Polyline for connected chains that stay together",
      "Lines have no width - use Pipe or Extrude for tube geometry",
    ],
    relatedCommands: ["polyline", "rectangle", "arc", "extrude"],
  },
  polyline: {
    tips: [
      "Right-click at any time to finish without adding another point",
      "Use Tab to cycle through overlapping snap candidates",
      "Close the polyline by clicking near the start point",
      "Polylines can be converted to smooth NURBS curves with Interpolate",
    ],
    examples: [
      "Draw a floor plan outline to extrude into walls",
      "Trace an imported image reference to create a profile",
      "Create a path for pipe sweeps or array distributions",
    ],
    pitfalls: [
      "Polylines have sharp corners - use Fillet to round them after creation",
      "Very short segments can cause issues with offset operations",
    ],
    relatedCommands: ["line", "curve", "fillet", "interpolate", "extrude"],
  },
  rectangle: {
    tips: [
      "Type 'width,height' (e.g., '10,5') for exact dimensions",
      "Hold Shift while dragging to constrain to a square",
      "The rectangle is created on the active C-Plane",
      "First click sets one corner, second click sets the opposite corner",
    ],
    examples: [
      "Create a floor plate profile for extrusion",
      "Draw a rectangular boundary for array patterns",
      "Define a trim boundary for surface operations",
    ],
    pitfalls: [
      "Rectangles are axis-aligned to the C-Plane - rotate the C-Plane for angled rectangles",
      "The output is a closed polyline, not a surface",
    ],
    relatedCommands: ["circle", "surface", "extrude", "boolean"],
  },
  circle: {
    tips: [
      "Type a radius value in the command line for exact sizing",
      "Hold Shift while dragging to snap to common radii",
      "Circles are perfect NURBS curves with exact mathematical definition",
      "Use as profile for Extrude, Loft, or Pipe operations",
    ],
    examples: [
      "Create wheel profiles for a vehicle design",
      "Draw circular openings for Boolean subtraction",
      "Define column cross-sections for structural elements",
    ],
    pitfalls: [
      "Circles need to be converted to mesh for some export formats",
      "Very small circles may tessellate poorly at low resolution",
    ],
    relatedCommands: ["arc", "disk", "cylinder", "extrude"],
  },
  arc: {
    tips: [
      "Three-point definition: start, end, then a point on the arc",
      "The third point determines the arc's curvature (bulge)",
      "Arcs can be joined with lines to create complex profiles",
      "Use snaps for precise endpoint positioning",
    ],
    examples: [
      "Create rounded corners on a polyline by replacing sharp vertices with arcs",
      "Design cam profiles with precise circular segments",
      "Build arch shapes for architectural elements",
    ],
    pitfalls: [
      "The three points must not be collinear (on a straight line)",
      "Arc direction depends on the order of points",
    ],
    relatedCommands: ["circle", "curve", "fillet"],
  },
  curve: {
    tips: [
      "Control points influence but don't necessarily lie on the curve (except endpoints)",
      "Degree parameter affects smoothness: 2=quadratic, 3=cubic, higher=smoother",
      "More control points allow more complex shapes but can be harder to manage",
      "Use Interpolate command if you need the curve to pass through all points",
    ],
    examples: [
      "Design organic profiles for furniture or product shells",
      "Create smooth paths for sweep operations",
      "Define spline rails for complex surface generation",
    ],
    pitfalls: [
      "Too many control points can create unwanted waviness",
      "Control point editing requires practice to achieve desired shapes",
    ],
    relatedCommands: ["polyline", "interpolate", "loft", "surface"],
  },

  // === PRIMITIVES ===
  box: {
    tips: [
      "First click sets one base corner, drag sets width and depth, final click/drag sets height",
      "Type 'W,D,H' for exact dimensions (e.g., '10,10,5')",
      "Boxes are created axis-aligned to the C-Plane",
      "Use as Boolean operands for additive/subtractive modeling",
    ],
    examples: [
      "Create building massing for urban design studies",
      "Define bounding volumes for collision detection",
      "Build modular furniture components",
    ],
    pitfalls: [
      "Boxes are mesh geometry - use NURBS Box for CAD precision",
      "For rotated boxes, rotate the C-Plane first or transform after creation",
    ],
    relatedCommands: ["nurbsbox", "sphere", "cylinder", "boolean"],
  },
  sphere: {
    tips: [
      "Click to place center, drag to set radius",
      "Spheres have even vertex distribution for good tessellation",
      "Use for organic forms, ball joints, or Boolean sculpting",
      "Combine with Boolean difference to create hollow shells",
    ],
    examples: [
      "Create ball bearings for mechanical assemblies",
      "Design decorative ornaments or furniture knobs",
      "Generate spherical containers or domes",
    ],
    pitfalls: [
      "Mesh spheres have poles where triangles converge - use Geodesic Sphere for even distribution",
      "UV mapping on spheres can be tricky near the poles",
    ],
    relatedCommands: ["hemisphere", "nurbssphere", "geodesicSphere", "boolean"],
  },
  cylinder: {
    tips: [
      "Click for base center, drag for radius, then drag for height",
      "Perfect for columns, pipes, wheels, and mechanical parts",
      "Cap options control whether the cylinder is open or closed",
      "Use Boolean subtraction for creating holes",
    ],
    examples: [
      "Create structural columns for architectural models",
      "Design wheels and rollers for mechanical systems",
      "Build cylindrical containers or vessels",
    ],
    pitfalls: [
      "Open cylinders have visible interior faces - close caps for solid appearance",
      "Very tall thin cylinders may need more segments for smooth appearance",
    ],
    relatedCommands: ["capsule", "pipe", "torus", "boolean"],
  },

  // === TRANSFORMS ===
  move: {
    tips: [
      "Drag axis arrows for constrained movement along X, Y, or Z",
      "Drag between arrows for planar movement (XY, XZ, YZ)",
      "Type 'X,Y,Z' for precise displacement from current position",
      "Use snaps to align with existing geometry",
    ],
    examples: [
      "Align objects to a grid by moving with grid snap enabled",
      "Stack objects vertically by moving in Z only",
      "Create offset copies by duplicating then moving",
    ],
    pitfalls: [
      "Movement is relative to current position, not absolute coordinates",
      "World vs Local coordinates affects movement direction",
    ],
    relatedCommands: ["rotate", "scale", "gumball", "array"],
  },
  rotate: {
    tips: [
      "Drag rotation rings for visual rotation (red=X, green=Y, blue=Z)",
      "Type angle in degrees for precise rotation",
      "Rotation occurs around the current pivot point - set pivot first if needed",
      "Hold Shift for 15° angle snapping",
    ],
    examples: [
      "Rotate a chair to face a table",
      "Create angled supports by rotating rectangular profiles",
      "Orient objects to match a reference direction",
    ],
    pitfalls: [
      "Multiple rotations can compound - use Undo if needed",
      "Pivot position significantly affects rotation result",
    ],
    relatedCommands: ["move", "scale", "pivot", "polarArray"],
  },
  scale: {
    tips: [
      "Drag corner handles for uniform scaling",
      "Drag edge handles for single-axis scaling",
      "Type scale factor (2 = double size, 0.5 = half size)",
      "Hold Shift for uniform scaling when dragging non-uniform handles",
    ],
    examples: [
      "Resize furniture to fit a room proportionally",
      "Create variations of a design at different scales",
      "Adjust imported models to the correct size",
    ],
    pitfalls: [
      "Non-uniform scaling can distort shapes unexpectedly",
      "Scale of 0 or negative values can cause issues",
    ],
    relatedCommands: ["move", "rotate", "gumball", "mirror"],
  },
  mirror: {
    tips: [
      "Click two points to define the mirror axis on the C-Plane",
      "The mirror plane is perpendicular to the C-Plane and passes through both points",
      "Original geometry can be kept or deleted after mirroring",
      "Model half of symmetric designs, then mirror",
    ],
    examples: [
      "Create symmetric furniture by modeling one half and mirroring",
      "Generate left/right variants of asymmetric parts",
      "Build complete buildings from half-floor plans",
    ],
    pitfalls: [
      "Mirror reverses face normals - may need Mesh Flip afterward",
      "Mirroring already-mirrored geometry can create duplicates",
    ],
    relatedCommands: ["duplicate", "array", "polarArray"],
  },
  array: {
    tips: [
      "Linear array: set direction vector, count, and spacing",
      "Copies are independent objects, not instances",
      "Preview shows result before confirming",
      "Use for repetitive elements like columns, stairs, or patterns",
    ],
    examples: [
      "Create a colonnade of equally spaced columns",
      "Build a staircase by arraying a single step",
      "Generate a row of seating or tables",
    ],
    pitfalls: [
      "Large arrays can slow performance - use instances in Numerica for efficiency",
      "Editing the original doesn't update array copies",
    ],
    relatedCommands: ["polarArray", "gridArray", "linearArray", "duplicate"],
  },

  // === BOOLEANS ===
  boolean: {
    tips: [
      "Both objects must be closed solids for reliable results",
      "Union combines volumes, Difference subtracts, Intersection keeps overlap",
      "Select the primary object first when order matters (Difference)",
      "Complex Booleans can be slow - simplify geometry when possible",
    ],
    examples: [
      "Create a hole by subtracting a cylinder from a box",
      "Combine multiple primitives into a complex solid",
      "Find the overlap between two volumes for interference checking",
    ],
    pitfalls: [
      "Open meshes or surfaces may produce unexpected results",
      "Coplanar faces (touching exactly) can cause failures - offset slightly",
      "Very complex Booleans may require mesh repair afterward",
    ],
    relatedCommands: ["meshBoolean", "meshmerge", "solid"],
  },

  // === EXTRUSION ===
  extrude: {
    tips: [
      "Select a closed profile for solid extrusion, open profile for surface",
      "Drag to set distance or type a value",
      "Negative values extrude in the opposite direction",
      "Cap option closes the ends for solid geometry",
    ],
    examples: [
      "Turn a floor plan into 3D walls",
      "Create text by extruding imported vector letters",
      "Build mechanical parts from 2D profiles",
    ],
    pitfalls: [
      "Self-intersecting profiles can cause failed extrusions",
      "Very thin extrusions may have rendering artifacts",
    ],
    relatedCommands: ["surface", "loft", "boolean", "sweep"],
  },
  loft: {
    tips: [
      "Select curves in order - the sequence defines the loft direction",
      "Curves should have similar point counts for best results",
      "Loft creates smooth transitions between different profiles",
      "Options include straight, normal, and developable loft types",
    ],
    examples: [
      "Create a vase by lofting between circular profiles of different sizes",
      "Design an aircraft fuselage by lofting between cross-sections",
      "Build ergonomic handles by lofting organic profiles",
    ],
    pitfalls: [
      "Mismatched curve directions can create twisted lofts",
      "Very different profile shapes may need intermediate curves",
    ],
    relatedCommands: ["extrude", "surface", "curve", "sweep"],
  },

  // === VIEW ===
  focus: {
    tips: [
      "Frames the selection with comfortable margins",
      "If nothing is selected, frames all visible geometry",
      "Doesn't change camera orientation, only position and zoom",
      "Use after getting lost in the viewport",
    ],
    examples: [
      "Quickly zoom to a specific object by selecting then focusing",
      "Reset view to show your entire model",
      "Navigate to imported geometry that appeared off-screen",
    ],
    relatedCommands: ["frameall", "zoom", "orbit", "view"],
  },
  display: {
    tips: [
      "Wireframe mode reveals topology and hidden edges",
      "Shaded mode shows smooth surfaces with lighting",
      "Ghosted mode makes objects semi-transparent",
      "Silhouette mode shows only outlines",
    ],
    examples: [
      "Use Wireframe to check edge alignment",
      "Switch to Shaded for presentation renders",
      "Enable Ghosted to see through objects for alignment",
    ],
    relatedCommands: ["isolate", "view", "screenshot"],
  },
};

/**
 * Extended documentation for Numerica nodes.
 * Each entry provides tips, examples, pitfalls, and related nodes.
 */
export const NODE_DOCUMENTATION: Record<string, NodeDocumentation> = {
  // === DATA NODES ===
  slider: {
    tips: [
      "Double-click the slider to enter exact values",
      "Connect to parameter inputs for real-time adjustments",
      "Use min/max to constrain the range of valid values",
      "Step parameter controls the precision of increments",
    ],
    examples: [
      "Control the radius of a sphere node for parametric sizing",
      "Drive the number of array copies with a slider",
      "Adjust loft tension or surface smoothness interactively",
    ],
    bestPractices: [
      "Name sliders descriptively to document their purpose",
      "Set reasonable min/max bounds to prevent invalid values",
      "Use consistent step sizes for similar parameters",
    ],
    relatedNodes: ["number", "remap", "expression"],
  },
  panel: {
    tips: [
      "Connect any output to inspect its current value",
      "Shows lists with indices for easy debugging",
      "Vectors display as X, Y, Z components",
      "Can display text when no input is connected",
    ],
    examples: [
      "Debug geometry dimensions by connecting to geometryInfo output",
      "Monitor calculation results to verify math operations",
      "Display formatted messages to document workflow state",
    ],
    relatedNodes: ["textNote", "geometryInfo", "measurement"],
  },
  geometryReference: {
    tips: [
      "Select geometry in Roslyn before using this node",
      "Referenced geometry updates automatically when edited in Roslyn",
      "Use for bringing hand-modeled shapes into parametric workflows",
      "Multiple references can be connected to different parts of a graph",
    ],
    examples: [
      "Reference a hand-drawn profile to extrude parametrically",
      "Bring a sculpted base mesh into a subdivision workflow",
      "Connect Roslyn geometry as input for analysis nodes",
    ],
    pitfalls: [
      "Deleting referenced geometry in Roslyn breaks the node connection",
      "Heavy geometry can slow graph updates",
    ],
    relatedNodes: ["meshConvert", "geometryInfo", "geometryViewer"],
  },

  // === PRIMITIVES ===
  box: {
    tips: [
      "Width, Depth, Height parameters control the dimensions",
      "Center parameter positions the box in space",
      "Output is mesh geometry suitable for Boolean operations",
      "Use for architectural massing or mechanical components",
    ],
    examples: [
      "Create a parametric cabinet by controlling dimensions with sliders",
      "Build modular shelving units with connected box nodes",
      "Generate building volumes for urban design studies",
    ],
    relatedNodes: ["sphere", "cylinder", "primitive", "boolean"],
  },
  sphere: {
    tips: [
      "Radius parameter controls size",
      "Segments parameter controls mesh resolution",
      "Higher segments = smoother appearance but more triangles",
      "Center parameter positions the sphere",
    ],
    examples: [
      "Create decorative elements like ornaments or knobs",
      "Build molecular models with appropriately sized spheres",
      "Generate spherical containers or dome structures",
    ],
    relatedNodes: ["geodesicSphere", "hemisphere", "box", "boolean"],
  },

  // === MESH OPERATIONS ===
  subdivideMesh: {
    tips: [
      "Linear subdivision splits without smoothing",
      "Catmull-Clark creates smooth quad surfaces",
      "Loop subdivision works on triangle meshes",
      "Each iteration approximately quadruples face count",
    ],
    examples: [
      "Smooth a low-poly model for high-quality rendering",
      "Add detail to a base mesh for sculpting",
      "Create smooth organic forms from blocky primitives",
    ],
    pitfalls: [
      "High iterations can create extremely heavy meshes",
      "Non-manifold geometry may not subdivide correctly",
    ],
    bestPractices: [
      "Start with clean quad topology for best results",
      "Use adaptive subdivision for non-uniform detail",
      "Keep iteration count low (1-3) for most uses",
    ],
    relatedNodes: ["meshRelax", "dualMesh", "quadRemesh"],
  },
  meshBoolean: {
    tips: [
      "Both input meshes must be closed (watertight)",
      "Union combines, Difference subtracts B from A, Intersection keeps overlap",
      "Complex operations may need mesh repair afterward",
      "Preview output before using in downstream operations",
    ],
    examples: [
      "Create holes by subtracting cylinders from a base mesh",
      "Combine multiple primitive shapes into complex solids",
      "Find the intersection volume of two objects",
    ],
    pitfalls: [
      "Open meshes produce unpredictable results",
      "Coincident faces (exact touching) can cause failures",
      "Very complex Booleans may be slow",
    ],
    relatedNodes: ["boolean", "meshRepair", "solid"],
  },

  // === TRANSFORMS ===
  move: {
    tips: [
      "Translation vector defines the displacement direction and distance",
      "Connect vector math nodes for computed movement",
      "Chain multiple moves for complex translations",
      "Movement is additive to current position",
    ],
    examples: [
      "Offset geometry along its normal direction",
      "Create stacked arrangements with incremental moves",
      "Position geometry based on calculated coordinates",
    ],
    relatedNodes: ["rotate", "scale", "linearArray", "moveVector"],
  },
  linearArray: {
    tips: [
      "Count controls the number of copies (including original)",
      "Spacing can be either distance between copies or total span",
      "Direction vector determines the array axis",
      "Outputs a list of geometry for further operations",
    ],
    examples: [
      "Create a row of columns for an architectural colonnade",
      "Generate stairs by arraying a single step",
      "Build fence posts at regular intervals",
    ],
    relatedNodes: ["polarArray", "gridArray", "geometryArray", "move"],
  },
  polarArray: {
    tips: [
      "Center point defines the rotation axis origin",
      "Axis vector determines the rotation direction",
      "Count sets the number of copies",
      "Angle range can be full 360° or partial",
    ],
    examples: [
      "Create a circular arrangement of chairs around a table",
      "Build gear teeth by arraying a single tooth profile",
      "Generate radial patterns for decorative designs",
    ],
    relatedNodes: ["linearArray", "gridArray", "rotate"],
  },

  // === MATH NODES ===
  expression: {
    tips: [
      "Supports standard operators: +, -, *, /, ^ (power)",
      "Built-in functions: sin, cos, tan, sqrt, abs, floor, ceil, round, log, exp",
      "Variables from inputs are available by their port names",
      "Use parentheses to control order of operations",
    ],
    examples: [
      "Calculate: 'sin(x * PI * 2) * amplitude + offset'",
      "Compute distances: 'sqrt(x^2 + y^2 + z^2)'",
      "Apply easing: '3*t^2 - 2*t^3' for smooth interpolation",
    ],
    pitfalls: [
      "Division by zero returns infinity - add guards if needed",
      "Trigonometric functions use radians",
    ],
    relatedNodes: ["scalarFunctions", "add", "multiply", "remap"],
  },
  remap: {
    tips: [
      "Maps a value from one range to another",
      "Input value in [oldMin, oldMax] becomes [newMin, newMax]",
      "Can invert ranges by swapping min/max",
      "Values outside input range are extrapolated",
    ],
    examples: [
      "Convert slider 0-100 to radius 0.5-5.0",
      "Map time 0-1 to rotation 0-360 degrees",
      "Normalize sensor data to standard ranges",
    ],
    relatedNodes: ["clamp", "expression", "linspace"],
  },
  vectorConstruct: {
    tips: [
      "Combines separate X, Y, Z numbers into a vector",
      "Essential for building vectors from calculated components",
      "Works with any numeric inputs",
      "Output can connect to any vector input port",
    ],
    examples: [
      "Build a movement vector from separate slider controls",
      "Construct position from calculated coordinates",
      "Create color vectors from RGB components",
    ],
    relatedNodes: ["vectorDeconstruct", "vectorAdd", "moveVector"],
  },

  // === LISTS ===
  listCreate: {
    tips: [
      "Connect multiple values to create an ordered list",
      "Works with any data types (numbers, vectors, geometry)",
      "Ports are added dynamically as you connect",
      "Order of connections determines list order",
    ],
    examples: [
      "Collect profile curves for lofting",
      "Gather points for point cloud creation",
      "Assemble parameters for batch processing",
    ],
    relatedNodes: ["listItem", "listLength", "listFlatten"],
  },
  range: {
    tips: [
      "Generates evenly spaced numbers between start and end",
      "Count includes both start and end values",
      "Step is calculated automatically from count",
      "For explicit step control, use linspace or expression",
    ],
    examples: [
      "Generate parameter values for sampling a curve",
      "Create indices for array operations",
      "Build time steps for animation",
    ],
    relatedNodes: ["linspace", "repeat", "listCreate"],
  },

  // === SOLVERS ===
  biologicalEvolutionSolver: {
    tips: [
      "Connect Genome Collector with slider-based genes",
      "Define phenotype with Geometry Phenotype nodes",
      "Evaluate fitness with Performs Fitness nodes",
      "Interactive popup shows evolution progress",
    ],
    examples: [
      "Optimize a bracket shape for minimum material with target strength",
      "Evolve furniture proportions based on ergonomic constraints",
      "Find optimal truss configurations for structural efficiency",
    ],
    bestPractices: [
      "Start with simple fitness functions and add complexity gradually",
      "Use reasonable population sizes (20-100) for initial exploration",
      "Save promising designs during evolution for comparison",
    ],
    relatedNodes: ["genomeCollector", "geometryPhenotype", "performsFitness"],
  },
  physicsSolver: {
    tips: [
      "Connect base geometry and goal nodes for analysis",
      "Load goals define forces applied to the structure",
      "Anchor goals define fixed supports",
      "Results include stress, strain, and displacement",
    ],
    examples: [
      "Analyze stress distribution in a beam under load",
      "Find deflection of a cantilevered shelf",
      "Verify structural capacity of a designed element",
    ],
    relatedNodes: ["loadGoal", "anchorGoal", "stiffnessGoal", "volumeGoal"],
  },
  chemistrySolver: {
    tips: [
      "Distributes materials based on multiple optimization goals",
      "Chemistry Material Goal assigns materials to regions",
      "Outputs include particle cloud and material field",
      "Preview mesh shows the optimized distribution",
    ],
    examples: [
      "Design a multi-material bracket with steel core and aluminum shell",
      "Optimize thermal insulation with varying material densities",
      "Create gradient materials for smooth property transitions",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistryStiffnessGoal", "chemistryMassGoal"],
  },
};

/**
 * Get command documentation by command ID.
 */
export const getCommandDocumentation = (commandId: string): CommandDocumentation | undefined =>
  COMMAND_DOCUMENTATION[commandId];

/**
 * Get node documentation by node type.
 */
export const getNodeDocumentation = (nodeType: string): NodeDocumentation | undefined =>
  NODE_DOCUMENTATION[nodeType];
