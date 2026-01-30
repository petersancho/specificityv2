/**
 * Extended documentation for Roslyn commands and Numerica nodes.
 * Keys must match IDs from registry.ts (commands) and nodeRegistry.ts (nodes).
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
 * COMMAND_DOCUMENTATION - Extended docs for Roslyn commands.
 */
export const COMMAND_DOCUMENTATION: Record<string, CommandDocumentation> = {
  // === GEOMETRY: Points & Curves ===
  point: {
    tips: [
      "Enable vertex snap to place on existing geometry",
      "Points are invisible in rendered views",
      "Use as construction guides before creating curves",
    ],
    examples: [
      "Place reference points for a loft operation",
      "Mark array positions before distributing objects",
    ],
    pitfalls: [
      "Points don't render in output—use small spheres for visible markers",
    ],
    relatedCommands: ["polyline", "curve", "line"],
  },
  line: {
    tips: [
      "Hold Shift for orthogonal constraint",
      "Type coordinates in command line for precision",
      "Chain segments by continuing to click",
    ],
    examples: [
      "Draw bracket profile then extrude",
      "Create construction grid with intersecting lines",
    ],
    pitfalls: [
      "Lines are individual segments—use Polyline for a connected chain",
    ],
    relatedCommands: ["polyline", "rectangle", "extrude"],
  },
  polyline: {
    tips: [
      "Right-click to finish without adding a point",
      "Close by clicking near the start",
      "Convert to smooth curve with Interpolate",
    ],
    examples: [
      "Draw floor plan outline to extrude into walls",
      "Trace reference image for profile creation",
    ],
    pitfalls: [
      "Sharp corners—use Fillet to round after creation",
    ],
    relatedCommands: ["line", "curve", "interpolate"],
  },
  rectangle: {
    tips: [
      "Type width,height for exact dimensions",
      "Hold Shift to constrain to square",
      "First click sets corner, second sets opposite",
    ],
    examples: [
      "Create floor plate for extrusion",
      "Define boundary for array pattern",
    ],
    pitfalls: [
      "Axis-aligned to C-Plane—rotate C-Plane for angled rectangles",
    ],
    relatedCommands: ["circle", "surface", "extrude"],
  },
  circle: {
    tips: [
      "Type radius value for exact size",
      "Perfect NURBS with exact curvature",
      "Use as profile for Extrude or Loft",
    ],
    examples: [
      "Create wheel profile for vehicle",
      "Define circular opening for Boolean",
    ],
    relatedCommands: ["arc", "extrude", "loft"],
  },
  arc: {
    tips: [
      "Three-point definition: start, end, bulge point",
      "Join with lines for complex profiles",
      "Curvature set by third point position",
    ],
    examples: [
      "Create rounded corners in profile",
      "Design cam or arch shapes",
    ],
    pitfalls: [
      "Points must not be collinear",
    ],
    relatedCommands: ["circle", "curve", "polyline"],
  },
  curve: {
    tips: [
      "Control points influence but don't lie on curve",
      "Higher degree = smoother (3 = cubic)",
      "Use Interpolate if curve must pass through points",
    ],
    examples: [
      "Design organic profiles for products",
      "Create sweep paths for pipes",
    ],
    relatedCommands: ["polyline", "interpolate", "loft"],
  },

  // === GEOMETRY: NURBS Primitives ===
  nurbsbox: {
    tips: [
      "Mathematically exact surfaces for CAD",
      "Convert to mesh for rendering",
    ],
    relatedCommands: ["nurbssphere", "nurbscylinder", "meshconvert"],
  },
  nurbssphere: {
    tips: [
      "Exact spherical surface definition",
      "Trimmable for partial spheres",
    ],
    relatedCommands: ["nurbsbox", "nurbscylinder"],
  },
  nurbscylinder: {
    tips: [
      "Exact circular cross-section",
      "Cap or leave open for pipe geometry",
    ],
    relatedCommands: ["nurbsbox", "nurbssphere"],
  },

  // === GEOMETRY: Mesh Operations ===
  interpolate: {
    tips: [
      "Creates curve passing through all vertices",
      "Works on polylines",
    ],
    examples: [
      "Smooth traced outline into NURBS curve",
    ],
    relatedCommands: ["curve", "polyline", "loft"],
  },
  surface: {
    tips: [
      "Input must be closed and planar",
      "Creates planar fill surface",
    ],
    examples: [
      "Cap extrusion with surface",
      "Create floor from closed outline",
    ],
    relatedCommands: ["extrude", "loft", "boolean"],
  },
  loft: {
    tips: [
      "Select profiles in order",
      "Similar point counts give best results",
      "Creates smooth transition between shapes",
    ],
    examples: [
      "Create vase by lofting circles of varying radii",
      "Design boat hull from cross-sections",
    ],
    pitfalls: [
      "Mismatched curve directions create twisted lofts",
    ],
    relatedCommands: ["extrude", "surface", "curve"],
  },
  extrude: {
    tips: [
      "Default direction is C-Plane normal",
      "Cap option closes ends for solid",
      "Negative distance extrudes opposite",
    ],
    examples: [
      "Turn floor plan into 3D walls",
      "Create text from letter outlines",
    ],
    relatedCommands: ["surface", "loft", "boolean"],
  },
  boolean: {
    tips: [
      "Both objects must be closed solids",
      "Union combines, Difference subtracts, Intersection keeps overlap",
    ],
    examples: [
      "Create hole by subtracting cylinder from box",
      "Combine primitives into complex solid",
    ],
    pitfalls: [
      "Coplanar faces can cause failures—offset slightly",
    ],
    relatedCommands: ["extrude", "meshmerge"],
  },
  meshconvert: {
    tips: [
      "Tessellates NURBS into triangles",
      "Required for STL export or mesh editing",
    ],
    relatedCommands: ["breptomesh", "nurbsrestore"],
  },
  breptomesh: {
    tips: [
      "Converts B-Rep solids to mesh",
      "Control density with tolerance settings",
    ],
    relatedCommands: ["meshconvert", "meshtobrep"],
  },
  meshtobrep: {
    tips: [
      "Each triangle becomes a B-Rep face",
      "Enables Boolean on imported meshes",
    ],
    relatedCommands: ["breptomesh", "boolean"],
  },
  nurbsrestore: {
    tips: [
      "Works best on recently converted meshes",
      "May fail if NURBS metadata lost",
    ],
    relatedCommands: ["meshconvert"],
  },
  meshmerge: {
    tips: [
      "Combines without welding vertices",
      "For geometric union use Boolean",
    ],
    relatedCommands: ["boolean", "meshflip"],
  },
  meshflip: {
    tips: [
      "Reverses normals and winding",
      "Fixes inside-out faces from import",
    ],
    relatedCommands: ["meshmerge", "meshthicken"],
  },
  meshthicken: {
    tips: [
      "Creates shell by offsetting along normals",
      "Set thickness and cap options",
    ],
    examples: [
      "Add wall thickness to thin surface",
    ],
    relatedCommands: ["meshflip", "extrude"],
  },

  // === TRANSFORM ===
  transform: {
    tips: [
      "Access move, rotate, scale via gumball",
      "Type values for precision",
    ],
    relatedCommands: ["move", "rotate", "scale", "gumball"],
  },
  move: {
    tips: [
      "Drag axis arrows for constrained movement",
      "Type XYZ for precise displacement",
    ],
    examples: [
      "Align objects by moving with snap",
      "Stack objects by moving in Z",
    ],
    relatedCommands: ["rotate", "scale", "gumball"],
  },
  rotate: {
    tips: [
      "Rotation uses current pivot",
      "Shift for 15° snap increments",
      "Positive angle = counter-clockwise",
    ],
    relatedCommands: ["move", "scale", "pivot"],
  },
  scale: {
    tips: [
      "Factor 2 doubles, 0.5 halves",
      "Shift for uniform scaling",
      "Scales from pivot point",
    ],
    relatedCommands: ["move", "rotate", "pivot"],
  },
  offset: {
    tips: [
      "Positive = outward, negative = inward",
      "Self-intersections handled automatically",
    ],
    examples: [
      "Create wall thickness from centerline",
    ],
    relatedCommands: ["mirror", "extrude"],
  },
  mirror: {
    tips: [
      "Click two points to define axis",
      "Original can be kept or deleted",
    ],
    examples: [
      "Model half, then mirror for symmetric design",
    ],
    relatedCommands: ["duplicate", "array"],
  },
  array: {
    tips: [
      "Set direction, spacing, and count",
      "Copies are independent objects",
    ],
    examples: [
      "Create colonnade of columns",
      "Build staircase by arraying step",
    ],
    relatedCommands: ["duplicate", "mirror"],
  },
  gumball: {
    tips: [
      "Drag arrows to move, rings to rotate, handles to scale",
      "Click center to switch modes",
    ],
    relatedCommands: ["move", "rotate", "scale"],
  },
  morph: {
    tips: [
      "Brush-based sculpting on mesh",
      "Adjust brush size and strength",
    ],
    relatedCommands: ["move", "scale"],
  },

  // === EDIT ===
  undo: {
    tips: [
      "Multiple undos step through history",
      "Some operations cannot be undone",
    ],
    relatedCommands: ["redo"],
  },
  redo: {
    tips: [
      "Only available after undo",
      "New changes clear redo stack",
    ],
    relatedCommands: ["undo"],
  },
  copy: {
    tips: [
      "Copies to system clipboard",
      "Can paste in other documents",
    ],
    relatedCommands: ["paste", "duplicate"],
  },
  paste: {
    tips: [
      "Choose placement: in place, cursor, or origin",
    ],
    relatedCommands: ["copy", "duplicate"],
  },
  duplicate: {
    tips: [
      "Creates copy at same location",
      "Faster than copy-paste for in-doc duplication",
    ],
    relatedCommands: ["copy", "array"],
  },
  delete: {
    tips: [
      "Removes selected geometry",
      "Recoverable with Undo",
    ],
    relatedCommands: ["undo"],
  },
  cancel: {
    tips: [
      "Aborts without committing",
      "Preview geometry removed",
    ],
    relatedCommands: ["confirm"],
  },
  confirm: {
    tips: [
      "Commits current operation",
      "Enter key also confirms",
    ],
    relatedCommands: ["cancel"],
  },

  // === VIEW ===
  focus: {
    tips: [
      "Frames selection with margin",
      "If nothing selected, frames all",
    ],
    relatedCommands: ["frameall", "zoom"],
  },
  frameall: {
    tips: [
      "Shows entire scene",
      "Ignores hidden objects",
    ],
    relatedCommands: ["focus", "zoom"],
  },
  screenshot: {
    tips: [
      "Opens export preview",
      "Choose resolution and format",
    ],
    relatedCommands: ["display"],
  },
  view: {
    tips: [
      "Orthographic views: Top, Front, Right",
      "Perspective shows depth",
    ],
    relatedCommands: ["camera", "display"],
  },
  camera: {
    tips: [
      "Zoom to cursor centers on mouse",
      "Invert zoom reverses scroll direction",
    ],
    relatedCommands: ["view", "orbit", "pan"],
  },
  pivot: {
    tips: [
      "Affects rotation and scale center",
      "Object Center, Origin, or Custom",
    ],
    relatedCommands: ["rotate", "scale"],
  },
  orbit: {
    tips: [
      "Right-click drag to orbit",
      "Rotates around scene center",
    ],
    relatedCommands: ["pan", "zoom"],
  },
  pan: {
    tips: [
      "Middle-click drag to pan",
      "Shift+right-click also works",
    ],
    relatedCommands: ["orbit", "zoom"],
  },
  zoom: {
    tips: [
      "Scroll wheel zooms",
      "Zoom to cursor for precision",
    ],
    relatedCommands: ["orbit", "pan", "focus"],
  },
  display: {
    tips: [
      "Wireframe shows edges only",
      "Ghosted makes objects transparent",
    ],
    relatedCommands: ["view", "isolate"],
  },
  isolate: {
    tips: [
      "Hide everything except selection",
      "Click again to show all",
    ],
    relatedCommands: ["display"],
  },

  // === UTILITY ===
  selectionfilter: {
    tips: [
      "Object, Vertex, Edge, or Face mode",
      "Filter shown in status bar",
    ],
    relatedCommands: ["cycle", "snapping"],
  },
  cycle: {
    tips: [
      "Tab key also cycles",
      "Use when objects overlap",
    ],
    relatedCommands: ["selectionfilter"],
  },
  snapping: {
    tips: [
      "Grid, Vertex, Endpoint, Midpoint, Intersection",
      "Multiple snaps can be active",
    ],
    relatedCommands: ["grid", "cplane"],
  },
  grid: {
    tips: [
      "Set spacing and units",
      "Adaptive grid scales with zoom",
    ],
    relatedCommands: ["snapping", "cplane"],
  },
  cplane: {
    tips: [
      "World XY, XZ, YZ presets",
      "Or click 3 points for custom",
    ],
    relatedCommands: ["grid", "snapping"],
  },
  outliner: {
    tips: [
      "Manage hierarchy and visibility",
      "Rename objects for organization",
    ],
    relatedCommands: ["isolate"],
  },
  tolerance: {
    tips: [
      "Affects coincident point detection",
      "Tighter = more accurate, slower",
    ],
    relatedCommands: ["snapping"],
  },
  status: {
    tips: [
      "Shows command prompts and coordinates",
      "Helpful for learning commands",
    ],
    relatedCommands: ["display"],
  },
};

/**
 * NODE_DOCUMENTATION - Extended docs for Numerica nodes.
 */
export const NODE_DOCUMENTATION: Record<string, NodeDocumentation> = {
  // === DATA ===
  geometryReference: {
    tips: [
      "Select geometry in Roslyn before adding this node to capture the reference",
      "Changes to referenced Roslyn geometry automatically propagate through the graph",
      "Essential bridge between direct modeling (Roslyn) and parametric workflows (Numerica)",
      "Multiple Geometry Reference nodes can reference different Roslyn objects",
      "Reference persists across save/load—geometry ID is stored, not geometry data",
    ],
    examples: [
      "Reference a Roslyn box → connect to Transform node → apply parametric rotation",
      "Reference building massing → connect to solver for structural optimization",
      "Reference curve profile → connect to Extrude with parametric height slider",
    ],
    pitfalls: [
      "Deleting Roslyn geometry breaks the reference—downstream nodes show errors",
      "Node appears empty if no geometry was selected when it was created",
    ],
    bestPractices: [
      "Name Roslyn geometry clearly before referencing for easier identification",
      "Use Group node to organize multiple geometry references visually",
    ],
    relatedNodes: ["geometryViewer", "geometryInfo", "meshConvert"],
    workflowNotes: "Geometry Reference is the primary way to bring Roslyn geometry into Numerica. Select the geometry you want to parametrize, add this node, then connect downstream nodes to build your parametric workflow.",
  },
  text: {
    tips: [
      "Double-click to edit content",
      "Use for labeling workflow sections",
    ],
    relatedNodes: ["panel", "textNote", "group"],
  },
  group: {
    tips: [
      "Drag nodes into group or draw around them",
      "Double-click title to rename",
      "Collapse to save space",
    ],
    relatedNodes: ["text", "panel"],
  },
  panel: {
    tips: [
      "Connect any output port to inspect its current value in real-time",
      "Lists display with indices for easy element identification",
      "Vectors show as {x, y, z} components; numbers show formatted values",
      "Edit fallback text when disconnected—useful for documentation",
      "Supports multi-line display with configurable max lines",
    ],
    examples: [
      "Debug mesh vertex count: Geometry Vertices → List Length → Panel",
      "Inspect solver output: Physics Solver → diagnostics → Panel",
      "Display calculated area: Mesh Area → Panel",
    ],
    pitfalls: [
      "Very long lists may be truncated—increase Max Lines parameter if needed",
      "Complex nested data may display as [Object]—use specific extraction nodes",
    ],
    bestPractices: [
      "Use multiple Panel nodes at key points to trace data flow through graph",
      "Add Index Start offset to show specific list ranges",
    ],
    relatedNodes: ["textNote", "geometryInfo", "metadataPanel"],
    workflowNotes: "Panel is the primary debugging and inspection node. Connect any output to see its current value. The display updates live as upstream parameters change.",
  },
  textNote: {
    tips: [
      "Displays and passes through data",
      "Add notes to document intermediate values",
    ],
    relatedNodes: ["panel", "text"],
  },
  slider: {
    tips: [
      "Drag the handle or click anywhere on the track to set the value",
      "Configure Min/Max to define meaningful parameter ranges for your design",
      "Step parameter controls increment precision (0.1 for decimals, 1 for integers)",
      "Connect to any numeric input for real-time interactive control",
      "Multiple sliders can drive complex parametric relationships",
      "Sliders define the search space when connected to Genome Collector for evolution",
    ],
    examples: [
      "Control building height: Slider(0-100m) → Extrude(distance)",
      "Parametric facade: Slider(0.1-0.9) → Panel Opening Ratio",
      "Array spacing: Slider(1-5) → Linear Array(spacing)",
      "Material thickness: Slider(0.01-0.1) → Mesh Thicken(distance)",
    ],
    pitfalls: [
      "Very small step values with large ranges create many possible values—may slow evolution",
      "Min > Max or equal values produce no output range",
    ],
    bestPractices: [
      "Name sliders descriptively: 'Panel Width' instead of 'Slider1'",
      "Set realistic architectural ranges (e.g., 2.4-4m for ceiling heights)",
      "Use integer steps for countable things (array count, floor levels)",
      "Use decimal steps for continuous measures (dimensions, angles)",
    ],
    relatedNodes: ["number", "remap", "expression", "genomeCollector"],
    workflowNotes: "Slider is the fundamental interactive control node. It outputs a numeric value that drives downstream parameters. Connect multiple sliders for multi-parameter design exploration.",
  },
  colorPicker: {
    tips: [
      "Outputs RGB vector and hex string",
      "RGB values range 0-1",
    ],
    relatedNodes: ["customMaterial", "vectorConstruct"],
  },
  customMaterial: {
    tips: [
      "Applies render color to geometry",
      "Does not affect geometry data",
    ],
    relatedNodes: ["colorPicker", "geometryViewer"],
  },
  annotations: {
    tips: [
      "Anchors text to geometry or point",
      "Appears in Roslyn viewport",
    ],
    relatedNodes: ["dimensions", "text"],
  },

  // === PREVIEW ===
  geometryViewer: {
    tips: [
      "Embedded mini viewport that displays connected geometry in 3D",
      "Rotate, pan, and zoom within the thumbnail for inspection",
      "Accepts optional Filter input for custom display modes (wireframe, ghosted, etc.)",
      "Outputs detected geometry type string for conditional logic",
      "Updates live as upstream parameters change—ideal for design iteration",
    ],
    examples: [
      "Preview mesh before export: Mesh Convert → Geometry Viewer",
      "Inspect solver result: Physics Solver → deformedMesh → Geometry Viewer",
      "Compare display modes: Geometry → Geometry Viewer (with different filters)",
    ],
    pitfalls: [
      "Very heavy geometry may render slowly in preview",
      "Hidden geometry in Roslyn still appears in Geometry Viewer",
    ],
    bestPractices: [
      "Place Geometry Viewers at key workflow stages to monitor results",
      "Use Preview Filter node for ghosted/wireframe views of internal structure",
      "Minimize viewport size for complex graphs to maintain performance",
    ],
    relatedNodes: ["customPreview", "previewFilter", "geometryReference"],
    workflowNotes: "Geometry Viewer provides inline 3D preview of geometry flowing through your graph. Essential for verifying intermediate results without switching to the main Roslyn viewport.",
  },
  customViewer: {
    tips: [
      "Lightweight viewer for Roslyn-focused previews",
      "Connect any geometry output to make it the designated display target",
    ],
    relatedNodes: ["geometryViewer", "customPreview", "previewFilter"],
  },
  customPreview: {
    tips: [
      "Combines geometry with Filter settings",
      "Geometry passes through unchanged",
    ],
    relatedNodes: ["geometryViewer", "previewFilter"],
  },
  previewFilter: {
    tips: [
      "Configure display mode, solidity, sheen",
      "Connect to Filter input of viewers",
    ],
    relatedNodes: ["geometryViewer", "customPreview"],
  },
  metadataPanel: {
    tips: [
      "Shows vertex/face count, bounds, area, volume",
      "Use for validation and documentation",
    ],
    relatedNodes: ["geometryInfo", "panel"],
  },
  dimensions: {
    tips: [
      "Shows live bounding box measurements",
      "Updates automatically",
    ],
    relatedNodes: ["measurement", "geometryInfo"],
  },

  // === PRIMITIVES ===
  point: {
    tips: [
      "Creates point at XYZ coordinates",
      "Use as reference or curve control vertex",
    ],
    relatedNodes: ["pointCloud", "line"],
  },
  pointCloud: {
    tips: [
      "Creates collection from coordinate lists",
      "Input vectors or separate X,Y,Z lists",
    ],
    relatedNodes: ["point", "voronoiPattern"],
  },
  line: {
    tips: [
      "Creates segment between start and end",
      "Outputs line and length",
    ],
    relatedNodes: ["polyline", "pipeSweep"],
  },
  polyline: {
    tips: [
      "Connects points with straight segments",
      "Closed option links last to first",
    ],
    relatedNodes: ["line", "curve", "fillet"],
  },
  rectangle: {
    tips: [
      "Creates closed 4-vertex polyline",
      "Set width, height, and center",
    ],
    relatedNodes: ["circle", "extrude"],
  },
  circle: {
    tips: [
      "Creates NURBS circle",
      "Set center and radius",
    ],
    relatedNodes: ["arc", "extrude"],
  },
  arc: {
    tips: [
      "Creates arc from angles",
      "Set center, radius, start/end angles",
    ],
    relatedNodes: ["circle", "curve"],
  },
  curve: {
    tips: [
      "Creates NURBS through control points",
      "Degree controls smoothness",
    ],
    relatedNodes: ["polyline", "loft"],
  },
  box: {
    tips: [
      "Set width, depth, height",
      "Center positions the box",
    ],
    relatedNodes: ["sphere", "boolean"],
  },
  sphere: {
    tips: [
      "Set radius and segments",
      "Higher segments = smoother",
    ],
    relatedNodes: ["box", "geodesicSphere"],
  },
  primitive: {
    tips: [
      "Generic node with selectable type",
      "Parameters adapt to shape",
    ],
    relatedNodes: ["box", "sphere"],
  },

  // === SURFACES ===
  surface: {
    tips: [
      "Creates surface from boundary curves",
      "Input must be closed for planar fill",
    ],
    relatedNodes: ["loft", "extrude"],
  },
  loft: {
    tips: [
      "Connects profiles with smooth surface",
      "Order defines direction",
    ],
    relatedNodes: ["surface", "extrude"],
  },
  extrude: {
    tips: [
      "Pushes profile along direction",
      "Cap option closes ends",
    ],
    relatedNodes: ["surface", "loft", "boolean"],
  },
  pipeSweep: {
    tips: [
      "Sweeps circle along curve",
      "Set radius and segments",
    ],
    relatedNodes: ["pipeMerge", "curve"],
  },
  pipeMerge: {
    tips: [
      "Blends pipe junctions",
      "Use after creating individual pipes",
    ],
    relatedNodes: ["pipeSweep"],
  },
  offsetSurface: {
    tips: [
      "Offsets surface along normals",
      "Creates parallel shell",
    ],
    relatedNodes: ["thickenMesh", "offset"],
  },

  // === MESH ===
  meshConvert: {
    tips: [
      "Converts geometry to mesh",
      "Handles curves, surfaces, B-Rep",
    ],
    relatedNodes: ["nurbsToMesh", "brepToMesh"],
  },
  nurbsToMesh: {
    tips: [
      "Converts NURBS to triangles",
      "Thickness creates pipe from curves",
    ],
    relatedNodes: ["meshConvert", "brepToMesh"],
  },
  brepToMesh: {
    tips: [
      "Tessellates B-Rep to mesh",
      "Control density with settings",
    ],
    relatedNodes: ["meshConvert", "meshToBrep"],
  },
  meshToBrep: {
    tips: [
      "Creates B-Rep from mesh",
      "Enables topology operations",
    ],
    relatedNodes: ["brepToMesh", "boolean"],
  },
  subdivideMesh: {
    tips: [
      "Linear, Catmull-Clark, Loop, or Adaptive",
      "Each iteration roughly quadruples faces",
    ],
    pitfalls: [
      "High iterations create heavy meshes",
    ],
    relatedNodes: ["meshRelax", "dualMesh"],
  },
  dualMesh: {
    tips: [
      "Face centers become vertices",
      "Triangles become hexagonal patterns",
    ],
    relatedNodes: ["subdivideMesh", "voronoiPattern"],
  },
  insetFaces: {
    tips: [
      "Shrinks faces inward",
      "Creates border ring of new faces",
    ],
    relatedNodes: ["extrudeFaces", "selectFaces"],
  },
  extrudeFaces: {
    tips: [
      "Pulls faces along normals",
      "Positive outward, negative inward",
    ],
    relatedNodes: ["insetFaces", "selectFaces"],
  },
  meshRelax: {
    tips: [
      "Smooths by averaging positions",
      "Iterations control intensity",
    ],
    relatedNodes: ["subdivideMesh", "meshRepair"],
  },
  selectFaces: {
    tips: [
      "Filters by normal direction",
      "Threshold controls tolerance",
    ],
    relatedNodes: ["insetFaces", "extrudeFaces"],
  },
  meshBoolean: {
    tips: [
      "Union, Difference, Intersection",
      "Inputs must be watertight",
    ],
    pitfalls: [
      "Coincident faces can cause failures",
    ],
    relatedNodes: ["boolean", "meshRepair"],
  },
  triangulateMesh: {
    tips: [
      "Converts all faces to triangles",
      "Required for some operations and export",
    ],
    relatedNodes: ["quadRemesh", "meshRepair"],
  },
  meshRepair: {
    tips: [
      "Fixes degenerates, holes, normals",
      "Run after imports or Booleans",
    ],
    relatedNodes: ["meshBoolean", "triangulateMesh"],
  },
  meshUVs: {
    tips: [
      "Generates texture coordinates",
      "Planar, Box, Cylindrical, Spherical",
    ],
    relatedNodes: ["meshRepair"],
  },
  meshDecimate: {
    tips: [
      "Reduces triangle count",
      "Preserves shape and boundaries",
    ],
    relatedNodes: ["quadRemesh", "meshRepair"],
  },
  quadRemesh: {
    tips: [
      "Converts to quad-dominant topology",
      "Better for subdivision and animation",
    ],
    relatedNodes: ["meshDecimate", "subdivideMesh"],
  },
  geodesicSphere: {
    tips: [
      "Subdivides icosahedron",
      "Even vertex distribution",
    ],
    relatedNodes: ["sphere", "subdivideMesh"],
  },
  voronoiPattern: {
    tips: [
      "Generates 3D Voronoi cells",
      "Organic-looking divisions",
    ],
    relatedNodes: ["hexagonalTiling", "pointCloud"],
  },
  hexagonalTiling: {
    tips: [
      "Creates honeycomb pattern",
      "Set size and count",
    ],
    relatedNodes: ["voronoiPattern", "offsetPattern"],
  },
  offsetPattern: {
    tips: [
      "Creates gaps between elements",
      "Frame width controls offset",
    ],
    relatedNodes: ["hexagonalTiling", "voronoiPattern"],
  },
  solid: {
    tips: [
      "Caps boundary loops",
      "Creates closed solid from surface",
    ],
    relatedNodes: ["extrude", "boolean"],
  },
  thickenMesh: {
    tips: [
      "Adds thickness by offsetting normals",
      "Caps edges automatically",
    ],
    relatedNodes: ["offsetSurface", "meshConvert"],
  },
  plasticwrap: {
    tips: [
      "Projects mesh toward target",
      "Blend controls projection strength",
    ],
    relatedNodes: ["fieldTransformation"],
  },
  fillet: {
    tips: [
      "Rounds polyline corners with arcs",
      "Radius controls fillet size",
    ],
    relatedNodes: ["filletEdges", "offset"],
  },
  filletEdges: {
    tips: [
      "Bevels mesh edges",
      "Width and segments control smoothness",
    ],
    relatedNodes: ["fillet", "subdivideMesh"],
  },
  offset: {
    tips: [
      "Creates parallel curve",
      "Positive outward, negative inward",
    ],
    relatedNodes: ["fillet", "offsetPattern"],
  },
  boolean: {
    tips: [
      "Union, Difference, Intersection",
      "Inputs must be closed solids",
    ],
    relatedNodes: ["meshBoolean", "extrude"],
  },

  // === TRANSFORMS ===
  move: {
    tips: [
      "Translates by vector displacement",
      "Chain multiple moves for complex translations",
    ],
    relatedNodes: ["rotate", "scale", "linearArray"],
  },
  rotate: {
    tips: [
      "Rotates around axis by angle",
      "Angle in degrees",
    ],
    relatedNodes: ["move", "scale", "polarArray"],
  },
  scale: {
    tips: [
      "Scales from center point",
      "Separate XYZ factors for stretching",
    ],
    relatedNodes: ["move", "rotate"],
  },
  fieldTransformation: {
    tips: [
      "Deforms using field values",
      "Falloff controls extent",
    ],
    relatedNodes: ["pointAttractor", "move"],
  },
  movePoint: {
    tips: [
      "Moves point by XYZ offsets",
      "Simple point translation",
    ],
    relatedNodes: ["movePointByVector", "point"],
  },
  movePointByVector: {
    tips: [
      "Moves point by vector displacement",
      "Same as move but for points",
    ],
    relatedNodes: ["movePoint", "vectorConstruct"],
  },
  rotateVectorAxis: {
    tips: [
      "Rotates vector around axis",
      "Angle in degrees",
    ],
    relatedNodes: ["rotate", "vectorCross"],
  },
  mirrorVector: {
    tips: [
      "Reflects across plane normal",
      "Use for bounce/reflection",
    ],
    relatedNodes: ["vectorProject"],
  },

  // === ARRAYS ===
  linearArray: {
    tips: [
      "Count includes original",
      "Set direction and spacing",
    ],
    examples: [
      "Row of columns",
      "Staircase steps",
    ],
    relatedNodes: ["polarArray", "gridArray"],
  },
  polarArray: {
    tips: [
      "Distributes around axis",
      "Set count and angle range",
    ],
    examples: [
      "Circular chair arrangement",
      "Gear teeth",
    ],
    relatedNodes: ["linearArray", "gridArray"],
  },
  gridArray: {
    tips: [
      "2D or 3D grid of copies",
      "Counts and spacing per axis",
    ],
    relatedNodes: ["linearArray", "polarArray"],
  },
  geometryArray: {
    tips: [
      "Applies array to geometry",
      "More flexible than direct arrays",
    ],
    relatedNodes: ["linearArray", "polarArray"],
  },

  // === VECTORS ===
  origin: {
    tips: [
      "Outputs (0,0,0)",
      "Use as reference point",
    ],
    relatedNodes: ["unitX", "unitY", "unitZ"],
  },
  unitX: {
    tips: ["Outputs (1,0,0)", "X-axis direction"],
    relatedNodes: ["unitY", "unitZ", "origin"],
  },
  unitY: {
    tips: ["Outputs (0,1,0)", "Y-axis direction"],
    relatedNodes: ["unitX", "unitZ", "origin"],
  },
  unitZ: {
    tips: ["Outputs (0,0,1)", "Z-axis direction"],
    relatedNodes: ["unitX", "unitY", "origin"],
  },
  unitXYZ: {
    tips: ["Outputs normalized (1,1,1)", "Diagonal direction"],
    relatedNodes: ["unitX", "unitY", "unitZ"],
  },
  moveVector: {
    tips: [
      "Creates vector from XYZ components",
      "Use for translation",
    ],
    relatedNodes: ["vectorConstruct", "move"],
  },
  scaleVector: {
    tips: [
      "Creates scale factors per axis",
      "Use for non-uniform scaling",
    ],
    relatedNodes: ["vectorScale", "scale"],
  },
  vectorConstruct: {
    tips: [
      "Builds vector from X, Y, Z inputs",
      "Combines separate numbers",
    ],
    relatedNodes: ["vectorDeconstruct", "moveVector"],
  },
  vectorDeconstruct: {
    tips: [
      "Splits vector to X, Y, Z",
      "Extracts components",
    ],
    relatedNodes: ["vectorConstruct"],
  },
  vectorAdd: {
    tips: [
      "Adds component-wise",
      "Combine translations",
    ],
    relatedNodes: ["vectorSubtract", "vectorScale"],
  },
  vectorSubtract: {
    tips: [
      "A minus B",
      "Direction from B to A",
    ],
    relatedNodes: ["vectorAdd", "vectorFromPoints"],
  },
  vectorScale: {
    tips: [
      "Multiplies by scalar",
      "Scales magnitude, keeps direction",
    ],
    relatedNodes: ["vectorNormalize", "scaleVector"],
  },
  vectorLength: {
    tips: [
      "Returns magnitude",
      "Use for distance calculations",
    ],
    relatedNodes: ["vectorNormalize", "distance"],
  },
  vectorNormalize: {
    tips: [
      "Scales to unit length",
      "Keeps direction, magnitude = 1",
    ],
    relatedNodes: ["vectorLength", "vectorScale"],
  },
  vectorDot: {
    tips: [
      "Returns scalar alignment",
      "1 = parallel, 0 = perpendicular, -1 = opposite",
    ],
    relatedNodes: ["vectorCross", "vectorAngle"],
  },
  vectorCross: {
    tips: [
      "Returns perpendicular vector",
      "Use for normals and rotation axes",
    ],
    relatedNodes: ["vectorDot", "rotateVectorAxis"],
  },
  distance: {
    tips: [
      "Distance between two points",
      "Returns single number",
    ],
    relatedNodes: ["vectorLength", "proximity3d"],
  },
  vectorFromPoints: {
    tips: [
      "Direction from A to B",
      "Length equals distance",
    ],
    relatedNodes: ["vectorSubtract", "distance"],
  },
  vectorAngle: {
    tips: [
      "Angle in degrees",
      "Returns 0-180 range",
    ],
    relatedNodes: ["vectorDot", "rotate"],
  },
  vectorLerp: {
    tips: [
      "Linear interpolation",
      "Factor 0 = A, 1 = B, 0.5 = midpoint",
    ],
    relatedNodes: ["remap", "linspace"],
  },
  vectorProject: {
    tips: [
      "Projects A onto B",
      "Returns parallel component",
    ],
    relatedNodes: ["vectorDot", "mirrorVector"],
  },
  pointAttractor: {
    tips: [
      "Creates attraction field",
      "Strength > 0 attracts, < 0 repels",
    ],
    relatedNodes: ["fieldTransformation", "proximity3d"],
  },

  // === MATH ===
  number: {
    tips: [
      "Outputs constant value",
      "Use for fixed parameters",
    ],
    relatedNodes: ["slider", "expression"],
  },
  add: {
    tips: ["Adds two numbers", "Basic arithmetic"],
    relatedNodes: ["subtract", "multiply"],
  },
  subtract: {
    tips: ["A minus B", "Order matters"],
    relatedNodes: ["add", "divide"],
  },
  multiply: {
    tips: ["Multiplies two numbers", "Use for scaling"],
    relatedNodes: ["divide", "add"],
  },
  divide: {
    tips: ["A divided by B", "Handles zero gracefully"],
    relatedNodes: ["multiply", "subtract"],
  },
  clamp: {
    tips: [
      "Constrains to min/max range",
      "Values outside become boundary",
    ],
    relatedNodes: ["min", "max", "remap"],
  },
  min: {
    tips: ["Returns smaller value", "Use for upper bounds"],
    relatedNodes: ["max", "clamp"],
  },
  max: {
    tips: ["Returns larger value", "Use for lower bounds"],
    relatedNodes: ["min", "clamp"],
  },
  expression: {
    tips: [
      "Evaluates math expressions",
      "Supports +, -, *, /, ^, sin, cos, sqrt, etc.",
    ],
    examples: [
      "sin(x * PI * 2) * amplitude",
      "sqrt(x^2 + y^2)",
    ],
    relatedNodes: ["scalarFunctions", "number"],
  },
  scalarFunctions: {
    tips: [
      "Common functions: abs, floor, ceil, sqrt, sin, cos",
      "Single input, single output",
    ],
    relatedNodes: ["expression", "clamp"],
  },
  conditional: {
    tips: [
      "If-then-else for numbers",
      "Condition > 0 selects True output",
    ],
    relatedNodes: ["expression", "clamp"],
  },

  // === LISTS ===
  listCreate: {
    tips: [
      "Collects values into list",
      "Ports added dynamically",
    ],
    relatedNodes: ["listItem", "listLength"],
  },
  listLength: {
    tips: [
      "Returns item count",
      "Empty list = 0",
    ],
    relatedNodes: ["listCreate", "listItem"],
  },
  listItem: {
    tips: [
      "Extracts by index",
      "0 = first, -1 = last",
    ],
    relatedNodes: ["listCreate", "listSlice"],
  },
  listIndexOf: {
    tips: [
      "Finds item index",
      "-1 if not found",
    ],
    relatedNodes: ["listItem", "listCreate"],
  },
  listPartition: {
    tips: [
      "Splits into chunks",
      "Set size and step",
    ],
    relatedNodes: ["listSlice", "listFlatten"],
  },
  listFlatten: {
    tips: [
      "Flattens nested lists",
      "Depth controls levels",
    ],
    relatedNodes: ["listPartition", "gridArray"],
  },
  listSlice: {
    tips: [
      "Extracts portion",
      "Start to end indices",
    ],
    relatedNodes: ["listItem", "listReverse"],
  },
  listReverse: {
    tips: [
      "Reverses order",
      "First becomes last",
    ],
    relatedNodes: ["listSlice"],
  },
  listSum: {
    tips: ["Adds all values", "Returns total"],
    relatedNodes: ["listAverage", "add"],
  },
  listAverage: {
    tips: ["Calculates mean", "Sum / count"],
    relatedNodes: ["listSum", "listMedian"],
  },
  listMin: {
    tips: ["Returns smallest", "Numeric values only"],
    relatedNodes: ["listMax", "min"],
  },
  listMax: {
    tips: ["Returns largest", "Numeric values only"],
    relatedNodes: ["listMin", "max"],
  },
  listMedian: {
    tips: ["Middle value when sorted", "Robust to outliers"],
    relatedNodes: ["listAverage"],
  },
  listStdDev: {
    tips: ["Standard deviation", "Measures spread"],
    relatedNodes: ["listAverage"],
  },

  // === RANGES ===
  range: {
    tips: [
      "Generates sequence",
      "Start to end with count",
    ],
    relatedNodes: ["linspace", "repeat"],
  },
  linspace: {
    tips: [
      "Evenly spaced values",
      "Includes both endpoints",
    ],
    relatedNodes: ["range", "remap"],
  },
  remap: {
    tips: [
      "Maps value between ranges",
      "[oldMin, oldMax] → [newMin, newMax]",
    ],
    relatedNodes: ["clamp", "linspace"],
  },
  random: {
    tips: [
      "Generates random number",
      "Seed for reproducibility",
    ],
    relatedNodes: ["range", "linspace"],
  },
  repeat: {
    tips: [
      "Repeats value N times",
      "Creates constant list",
    ],
    relatedNodes: ["range", "listCreate"],
  },

  // === SIGNALS ===
  sineWave: {
    tips: [
      "Smooth oscillation",
      "Amplitude, frequency, phase, offset",
    ],
    relatedNodes: ["cosineWave", "triangleWave"],
  },
  cosineWave: {
    tips: [
      "Sine shifted 90°",
      "Starts at peak",
    ],
    relatedNodes: ["sineWave", "triangleWave"],
  },
  triangleWave: {
    tips: [
      "Linear up then down",
      "Symmetric zigzag",
    ],
    relatedNodes: ["sawtoothWave", "sineWave"],
  },
  sawtoothWave: {
    tips: [
      "Linear ramp that resets",
      "Asymmetric oscillation",
    ],
    relatedNodes: ["triangleWave", "squareWave"],
  },
  squareWave: {
    tips: [
      "Alternates high/low",
      "Duty cycle controls ratio",
    ],
    relatedNodes: ["sawtoothWave", "conditional"],
  },

  // === ANALYSIS ===
  geometryInfo: {
    tips: [
      "Shows vertex/face/edge counts",
      "Includes bounds, area, volume",
    ],
    relatedNodes: ["measurement", "metadataPanel"],
  },
  measurement: {
    tips: [
      "Distance, angle, area, volume",
      "Select measurement type",
    ],
    relatedNodes: ["geometryInfo", "dimensions"],
  },
  geometryVertices: {
    tips: [
      "Extracts all vertices",
      "Returns point list",
    ],
    relatedNodes: ["geometryEdges", "geometryFaces"],
  },
  geometryEdges: {
    tips: [
      "Extracts edges as lines",
      "Returns line list",
    ],
    relatedNodes: ["geometryVertices", "geometryFaces"],
  },
  geometryFaces: {
    tips: [
      "Extracts face centroids",
      "Mesh only",
    ],
    relatedNodes: ["geometryVertices", "geometryNormals"],
  },
  geometryNormals: {
    tips: [
      "Extracts normal vectors",
      "Face or vertex normals",
    ],
    relatedNodes: ["geometryFaces", "geometryVertices"],
  },
  geometryControlPoints: {
    tips: [
      "Extracts NURBS control points",
      "Curves and surfaces only",
    ],
    relatedNodes: ["curve", "geometryVertices"],
  },
  proximity3d: {
    tips: [
      "Finds nearest geometry",
      "Returns point, distance, index",
    ],
    relatedNodes: ["proximity2d", "curveProximity"],
  },
  proximity2d: {
    tips: [
      "2D nearest in XY plane",
      "Faster for planar problems",
    ],
    relatedNodes: ["proximity3d"],
  },
  curveProximity: {
    tips: [
      "Closest point on curve",
      "Returns point, parameter, distance",
    ],
    relatedNodes: ["proximity3d", "curve"],
  },

  // === INTERCHANGE ===
  stlImport: {
    tips: [
      "Imports STL mesh files",
      "ASCII and binary supported",
    ],
    relatedNodes: ["stlExport", "meshRepair"],
  },
  stlExport: {
    tips: [
      "Exports to STL format",
      "For 3D printing and exchange",
    ],
    relatedNodes: ["stlImport", "meshConvert"],
  },

  // === VOXEL ===
  voxelizeGeometry: {
    tips: [
      "Converts to voxel grid",
      "Surface or solid mode",
    ],
    relatedNodes: ["extractIsosurface", "topologySolver"],
  },
  extractIsosurface: {
    tips: [
      "Creates mesh from density field",
      "Marching cubes algorithm",
    ],
    relatedNodes: ["voxelizeGeometry", "topologySolver"],
  },
  topologyOptimize: {
    tips: [
      "Settings for topology optimization",
      "Connect to Topology Solver",
    ],
    relatedNodes: ["topologySolver", "voxelizeGeometry"],
  },
  topologySolver: {
    tips: [
      "Density-based optimization",
      "Iteratively removes material",
    ],
    relatedNodes: ["topologyOptimize", "extractIsosurface"],
  },

  // === SOLVERS ===
  biologicalSolver: {
    tips: [
      "Encodes design parameters as vector genomes that evolve over generations",
      "Fitness function guides selection pressure toward optimal configurations",
      "Use population sizes of 20-50 for initial exploration, larger for refinement",
      "Mutation rate 0.1-0.3 balances exploration vs convergence speed",
      "Set a random seed for reproducible evolutionary runs",
    ],
    examples: [
      "Evolve facade panel proportions: Slider(width) → Slider(height) → Genome Collector → Solver",
      "Multi-objective: maximize daylight + minimize material → Weighted Fitness → Solver",
      "Structural branching: grow tree-like supports using growth and nutrient goals",
    ],
    pitfalls: [
      "Empty genome (no sliders connected) produces no meaningful evolution",
      "Fitness always zero means no selection pressure—solver won't converge",
      "Too high mutation rate prevents convergence; too low causes premature convergence",
    ],
    bestPractices: [
      "Start with fewer generations to validate setup, then increase for better results",
      "Normalize fitness metrics to similar scales for multi-objective optimization",
      "Save promising genomes as presets for later refinement",
    ],
    relatedNodes: ["biologicalEvolutionSolver", "genomeCollector", "performsFitness"],
    workflowNotes: "The Biological Solver implements evolutionary algorithms for parameter optimization. Connect sliders to a Genome Collector to define the search space, wire metric nodes through Performs Fitness to define objectives, then run generations of evolution to find optimal configurations.",
  },
  biologicalEvolutionSolver: {
    tips: [
      "Opens dedicated popup UI for monitoring evolution progress",
      "Real-time fitness graphs show convergence over generations",
      "Pause/resume evolution to inspect intermediate results",
      "Export best genomes for documentation or reuse",
      "Supports both single-objective and multi-objective optimization",
    ],
    examples: [
      "Parametric pavilion: evolve structural depth, opening ratios, and material thickness",
      "Facade optimization: balance solar gain, views, and glare through weighted fitness",
      "Topological exploration: evolve connection patterns for space-frame structures",
    ],
    pitfalls: [
      "Missing Genome Collector connection disables evolution",
      "Missing Fitness connection means no selection criterion",
      "Very large populations slow down each generation significantly",
    ],
    bestPractices: [
      "Use Geometry Phenotype to capture the output geometry for visualization",
      "Wire multiple metrics with different weights to Performs Fitness for complex objectives",
      "Run short test evolutions (5-10 generations) to validate fitness response",
    ],
    relatedNodes: ["genomeCollector", "geometryPhenotype", "performsFitness", "biologicalSolver"],
    workflowNotes: "The Evolution Solver with popup provides full control over evolutionary optimization. Connect your parametric model through Genome Collector, define success criteria through Performs Fitness, and optionally capture geometry with Geometry Phenotype for live preview.",
  },
  physicsSolver: {
    tips: [
      "Solves structural equilibrium equation Kd = F for static analysis",
      "Requires at least one Anchor goal to define fixed boundary conditions",
      "If Load goals are present, include a Volume goal for material distribution",
      "Analysis types: static (equilibrium), dynamic (time-stepping), modal (vibration)",
      "Outputs include deformed mesh, stress field, displacements, and diagnostics",
      "Right-click the Numerica canvas and choose \"Add Physics Solver Rig\" to generate the cantilevered canopy setup",
    ],
    examples: [
      "Cantilevered canopy: Anchor one edge, Load center, Volume 0.3 → deformed shape",
      "Bridge deck: Anchor both ends, distributed Load, Stiffness goal for optimization",
      "Building core: Anchor base, lateral Load, analyze stress concentration",
    ],
    pitfalls: [
      "Missing Anchor goal causes solver failure—structure floats with no supports",
      "Load without Volume goal is ignored—both are needed for force analysis",
      "maxDeformation too low may prevent realistic deformation results",
      "Non-manifold or open meshes may produce unexpected stress patterns",
    ],
    bestPractices: [
      "Start with simple geometry to validate anchor and load placement",
      "Use Geometry Viewer to preview stress field colors after solving",
      "Increase maxIterations if solver doesn't converge",
      "Enable useGPU for large meshes to speed up computation",
    ],
    relatedNodes: ["loadGoal", "anchorGoal", "stiffnessGoal", "volumeGoal"],
    workflowNotes: "The Physics Solver (Ἐπιλύτης Φυσικῆς) performs finite element analysis on mesh geometry. Wire your base mesh, add goal nodes defining supports (Anchor), forces (Load), material targets (Volume, Stiffness), then run the solver to compute structural response.",
  },
  voxelSolver: {
    tips: [
      "Density-based topology optimization using voxel discretization",
      "Volume fraction controls how much material is retained (0.1-0.5 typical)",
      "Higher resolution = finer detail but slower computation",
      "SIMP penalization drives intermediate densities toward 0 or 1",
      "Extract final result with Extract Isosurface node",
    ],
    examples: [
      "Bracket optimization: anchor holes, load tip → minimum volume structure",
      "Architectural column: anchor base, load top → organic load paths emerge",
      "Heat sink: combine structural and thermal goals for multi-physics optimization",
    ],
    pitfalls: [
      "Very high resolution (>100³) can exhaust memory and take hours",
      "Volume fraction too low may disconnect the structure",
      "Filter radius too large creates overly smooth, blobby results",
    ],
    bestPractices: [
      "Start with low resolution (30-50) for quick iteration",
      "Use Voxelize Geometry to verify voxel boundary before optimization",
      "Export optimized density field for downstream smoothing or remeshing",
    ],
    relatedNodes: ["topologySolver", "voxelizeGeometry", "extractIsosurface"],
    workflowNotes: "The Voxel Solver discretizes geometry into a 3D grid and iteratively redistributes material density based on structural performance. Connect Voxelize Geometry for the domain, add goals, run optimization, then Extract Isosurface to convert back to mesh.",
  },
  chemistrySolver: {
    tips: [
      "Particle-based multi-material distribution for functionally graded composites",
      "Materials blend continuously based on physical properties and goals",
      "Seed points nucleate material species at specific locations",
      "Diffusion rate controls how quickly materials blend together",
      "Higher particle count = finer gradients but slower computation",
    ],
    examples: [
      "Curtain wall mullion: steel core → ceramic middle → glass exterior gradient",
      "Thermal bridge: steel beam transitions to insulating ceramic at envelope",
      "Structural glass: stiff core, transparent surfaces, blended transition zone",
    ],
    pitfalls: [
      "Domain must be watertight mesh—open boundaries cause particles to escape",
      "Missing material assignments result in empty solver with no gradients",
      "Goals with incompatible weights can produce dominated single-material results",
      "Very high diffusivity causes all materials to blend to uniform gray",
    ],
    bestPractices: [
      "Start with low particle count (~5000) for interactive exploration",
      "Use Material Goal to assign initial species to geometry regions",
      "Balance Stiffness and Blend goals for structural gradients",
      "Add Transparency Goal for regions requiring optical transmission",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistryStiffnessGoal", "chemistryBlendGoal"],
    workflowNotes: "The Chemistry Solver (Ἐπιλύτης Χημείας) implements functionally graded material design through particle simulation. Define material species with Material Goals, add optimization objectives (Stiffness, Mass, Transparency, Thermal), set diffusion parameters, and run to generate continuous material gradients.",
  },

  // === GOALS: Physics ===
  stiffnessGoal: {
    tips: [
      "Targets material stiffness (Young's modulus) for structural regions",
      "Weight 0-1 controls goal importance relative to other objectives",
      "Higher stiffness goals drive optimizer to concentrate material in load paths",
      "Combine with Volume goal to achieve lightweight but stiff designs",
    ],
    examples: [
      "Set stiffness 1.0 for primary structural members, 0.5 for secondary",
      "Use lower stiffness targets for connections that need flexibility",
    ],
    pitfalls: [
      "Stiffness alone doesn't create structure—combine with Load and Anchor",
      "Extremely high stiffness targets may conflict with Volume constraints",
    ],
    relatedNodes: ["volumeGoal", "loadGoal", "physicsSolver", "topologySolver"],
    workflowNotes: "Stiffness Goal (Σκληρότης) defines material performance targets. Connect to Physics Solver or Topology Solver to guide optimization toward stiffer configurations in structurally critical regions.",
  },
  volumeGoal: {
    tips: [
      "Sets target volume fraction (0-1) of material to retain after optimization",
      "0.3 = keep 30% of material, common for topology optimization",
      "Lower fractions create more dramatic material removal",
      "Essential companion to Load goals—both required for force analysis",
    ],
    examples: [
      "Bracket: Volume 0.25 → aggressive lightweighting",
      "Building core: Volume 0.5 → moderate optimization preserving robustness",
    ],
    pitfalls: [
      "Volume too low (< 0.1) may disconnect the structure",
      "Physics Solver ignores Load goals if no Volume goal is present",
    ],
    bestPractices: [
      "Start with Volume 0.4-0.5 for first optimization pass",
      "Reduce gradually to find minimum viable material distribution",
    ],
    relatedNodes: ["stiffnessGoal", "loadGoal", "physicsSolver", "topologySolver"],
    workflowNotes: "Volume Goal (Ὄγκος) constrains the amount of material available for optimization. The solver removes material from regions with low structural contribution while respecting the volume budget.",
  },
  loadGoal: {
    tips: [
      "Applies external force vectors to mesh geometry",
      "Force direction and magnitude define the loading condition",
      "Select faces or vertices for point loads vs distributed loads",
      "Multiple Load goals can define complex loading scenarios",
    ],
    examples: [
      "Gravity load: vector (0, 0, -9.81 * mass) on all vertices",
      "Wind load: lateral vector on facade surface",
      "Point load: single vertex with concentrated force",
    ],
    pitfalls: [
      "Load without Anchor = floating structure, solver fails",
      "Load without Volume goal = load is ignored in physics analysis",
      "Force applied to interior vertices may produce unexpected stress patterns",
    ],
    bestPractices: [
      "Visualize load vectors before running solver to verify direction",
      "Use multiple Load goals for different load cases (dead, live, wind)",
    ],
    relatedNodes: ["anchorGoal", "volumeGoal", "physicsSolver"],
    workflowNotes: "Load Goal (Βάρος) defines external forces acting on the structure. Forces flow through the material to anchor points, and the solver calculates resulting stresses and deformations.",
  },
  anchorGoal: {
    tips: [
      "Defines fixed boundary conditions where displacement is zero",
      "At least one Anchor required for valid structural analysis",
      "Select faces, edges, or vertices to anchor specific regions",
      "Anchored regions do not move during static or dynamic analysis",
    ],
    examples: [
      "Foundation: anchor bottom face of column",
      "Cantilever: anchor one end, leave other end free",
      "Simply supported: anchor ends but allow rotation",
    ],
    pitfalls: [
      "No anchors = structure has no supports, solver fails",
      "Over-constrained anchors can prevent realistic deformation",
      "Anchoring interior vertices may cause stress concentration artifacts",
    ],
    bestPractices: [
      "Anchor boundary faces that correspond to real-world supports",
      "Visualize anchor locations before running solver",
      "Use minimal anchors needed to prevent rigid body motion",
    ],
    relatedNodes: ["loadGoal", "volumeGoal", "physicsSolver"],
    workflowNotes: "Anchor Goal (Ἄγκυρα) establishes fixed supports for structural analysis. The solver computes how forces flow from Load regions through the structure to Anchor regions.",
  },

  // === GOALS: Biological Evolution ===
  genomeCollector: {
    tips: [
      "Collects slider values into a vector genome for evolutionary optimization",
      "Each connected slider becomes a gene that the solver can mutate",
      "Gene order matters—consistent ordering enables genome comparison",
      "Multiple sliders define multi-dimensional search spaces",
    ],
    examples: [
      "Connect 3 sliders (length, width, depth) for parametric box evolution",
      "Wire 10+ sliders for complex multi-parameter optimization",
    ],
    pitfalls: [
      "Disconnected sliders are not evolved—verify all parameters are wired",
      "Slider min/max ranges define the search bounds for each gene",
    ],
    bestPractices: [
      "Name sliders clearly to understand which parameters evolved",
      "Set reasonable slider ranges to avoid degenerate geometries",
    ],
    relatedNodes: ["geometryPhenotype", "performsFitness", "biologicalEvolutionSolver", "slider"],
    workflowNotes: "Genome Collector aggregates slider parameters into evolvable genomes. Connect all sliders that should participate in optimization, then wire the collector to the Biological Solver.",
  },
  geometryPhenotype: {
    tips: [
      "Captures the output geometry that results from genome parameter values",
      "Used for visualization during evolution—see designs update live",
      "Optional but recommended for understanding what evolved",
      "Multiple geometries can be captured for complex assemblies",
    ],
    examples: [
      "Connect final mesh output to see structure evolve visually",
      "Capture intermediate geometry to debug fitness function issues",
    ],
    relatedNodes: ["genomeCollector", "performsFitness", "biologicalEvolutionSolver"],
    workflowNotes: "Geometry Phenotype captures design outputs for live preview during evolution. Wire geometry from your parametric model to visualize how different genomes produce different designs.",
  },
  performsFitness: {
    tips: [
      "Aggregates multiple metric values into a single fitness score",
      "Higher fitness = better design (solver maximizes by default)",
      "Weights control relative importance of each objective",
      "Supports minimize mode—invert metrics or use negative weights",
    ],
    examples: [
      "Maximize structural efficiency: (stiffness * 0.7) + (1/weight * 0.3)",
      "Multi-objective: daylight hours, thermal performance, cost → weighted sum",
    ],
    pitfalls: [
      "All metrics zero = no selection pressure, evolution is random",
      "Unbalanced weights can dominate one objective completely",
    ],
    bestPractices: [
      "Normalize metrics to similar scales before weighting",
      "Test fitness function response to parameter changes before full evolution",
    ],
    relatedNodes: ["genomeCollector", "geometryPhenotype", "biologicalEvolutionSolver"],
    workflowNotes: "Performs Fitness defines the success criteria for evolution. Wire metric nodes (areas, volumes, distances) with weights, and the solver uses the aggregated fitness to guide selection.",
  },

  // === GOALS: Biological Growth ===
  growthGoal: {
    tips: [
      "Promotes biomass accumulation in specified directions or regions",
      "Intensity parameter controls growth rate (0-1)",
      "Direction vector biases growth toward light/nutrients/targets",
      "Combine with Nutrient Goal for tropism-like behavior",
    ],
    examples: [
      "Upward growth: direction (0, 0, 1), intensity 0.8",
      "Radial expansion: multiple growth goals pointing outward",
    ],
    relatedNodes: ["nutrientGoal", "morphogenesisGoal", "homeostasisGoal", "biologicalSolver"],
    workflowNotes: "Growth Goal drives biomass expansion during biological simulation. Material accumulates in growth-positive regions, creating organic volume increase.",
  },
  nutrientGoal: {
    tips: [
      "Defines nutrient source points that attract growth",
      "Growth follows nutrient gradients toward source locations",
      "Multiple nutrient sources create branching toward each",
      "Intensity controls attraction strength",
    ],
    examples: [
      "Single attractor: nutrient at top → tree-like upward branching",
      "Multiple attractors: nutrients at perimeter → radial branching network",
    ],
    relatedNodes: ["growthGoal", "morphogenesisGoal", "biologicalSolver"],
    workflowNotes: "Nutrient Goal creates chemotaxis-like attraction during biological growth. Material grows preferentially toward nutrient-rich regions, producing directional branching patterns.",
  },
  morphogenesisGoal: {
    tips: [
      "Controls branching density and pattern regularity",
      "Scale parameter affects branch spacing",
      "Density influences how many branches form at junctions",
      "Combines with Growth and Nutrient for full morphogenesis",
    ],
    examples: [
      "Dense branching: high density, small scale → intricate networks",
      "Sparse branching: low density, large scale → bold structural members",
    ],
    relatedNodes: ["growthGoal", "nutrientGoal", "homeostasisGoal", "biologicalSolver"],
    workflowNotes: "Morphogenesis Goal shapes the branching patterns during biological growth. Adjust density and scale to control how structures subdivide and ramify.",
  },
  homeostasisGoal: {
    tips: [
      "Maintains structural stability during growth simulation",
      "Penalizes configurations with excessive stress or strain",
      "Acts as a regularizer preventing runaway growth",
      "Weight controls stability vs growth trade-off",
    ],
    examples: [
      "Structural tree: homeostasis prevents thin branches from over-stressing",
      "Self-supporting: homeostasis ensures grown geometry can stand",
    ],
    relatedNodes: ["growthGoal", "morphogenesisGoal", "biologicalSolver"],
    workflowNotes: "Homeostasis Goal provides self-regulating feedback during biological growth. The solver penalizes structurally unsound configurations, ensuring grown forms remain viable.",
  },

  // === GOALS: Chemistry ===
  chemistryMaterialGoal: {
    tips: [
      "Assigns initial material species to seed geometry regions",
      "Select from material library: Steel, Ceramic, Glass, etc.",
      "Seeds nucleate material distribution—diffusion spreads from here",
      "Multiple Material Goals define different seed regions",
    ],
    examples: [
      "Assign Steel to beam core geometry → steel nucleates at core",
      "Assign Glass to facade geometry → glass nucleates at exterior",
    ],
    pitfalls: [
      "Seeds outside solver domain have no effect",
      "Missing material assignments result in empty solver",
    ],
    relatedNodes: ["chemistryStiffnessGoal", "chemistryBlendGoal", "chemistrySolver"],
    workflowNotes: "Material Goal defines initial material assignments for Chemistry Solver. Each assigned geometry becomes a seed region where that material species begins diffusion.",
  },
  chemistryStiffnessGoal: {
    tips: [
      "Biases stiff materials (steel, ceramic) toward load-bearing regions",
      "Automatically identifies stress concentrations from structural analysis",
      "Weight 0-1 controls priority relative to other chemistry goals",
      "Combine with Blend Goal for gradual stiffness transitions",
    ],
    examples: [
      "Mullion core: high stiffness goal → steel concentrates at center",
      "Connection detail: stiffness goal → ceramic accumulates at stress zones",
    ],
    relatedNodes: ["chemistryMassGoal", "chemistryBlendGoal", "chemistrySolver"],
    workflowNotes: "Chemistry Stiffness Goal drives high-stiffness materials toward structurally critical regions. The solver redistributes material species based on structural performance.",
  },
  chemistryMassGoal: {
    tips: [
      "Minimizes total material mass/density in specified regions",
      "Biases lightweight materials (glass, foam) toward target areas",
      "Balance with Stiffness Goal for light-but-strong designs",
      "Weight controls lightweighting intensity",
    ],
    examples: [
      "Facade exterior: mass goal → glass dominates visible surfaces",
      "Secondary structure: mass goal → lightweight materials where stiffness permits",
    ],
    relatedNodes: ["chemistryStiffnessGoal", "chemistryBlendGoal", "chemistrySolver"],
    workflowNotes: "Chemistry Mass Goal pushes the solver toward lightweight material configurations. Regions with strong mass goals favor low-density material species.",
  },
  chemistryBlendGoal: {
    tips: [
      "Enforces smooth, continuous gradients between material species",
      "Prevents abrupt material boundaries that cause stress concentrations",
      "Smoothness parameter controls gradient sharpness (0 = sharp, 1 = very smooth)",
      "Essential for functionally graded materials (FGM)",
    ],
    examples: [
      "Steel-to-glass: blend goal ensures gradual transition via intermediate ceramic",
      "Thermal bridge: blend goal creates smooth conductivity gradient",
    ],
    pitfalls: [
      "No blend goal → materials may form sharp, unrealistic boundaries",
      "Very high smoothness → materials blend to uniform gray, losing differentiation",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistryStiffnessGoal", "chemistrySolver"],
    workflowNotes: "Chemistry Blend Goal ensures continuous material gradients. The solver penalizes abrupt transitions, creating smooth compositional changes across the domain.",
  },
  chemistryTransparencyGoal: {
    tips: [
      "Biases transparent materials (glass) toward specified regions",
      "Useful for facade glazing, skylights, or optical elements",
      "Optical transmission property drives material selection",
      "Combine with structural goals for transparent-but-strong designs",
    ],
    examples: [
      "Facade glazing: transparency goal → glass dominates exterior surfaces",
      "Skylight: transparency goal at roof → glass transitions from opaque frame",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistryBlendGoal", "chemistrySolver"],
    workflowNotes: "Chemistry Transparency Goal optimizes for optical transmission. Regions with high transparency goals favor glass and other transparent material species.",
  },
  chemistryThermalGoal: {
    tips: [
      "Optimizes thermal conductivity for heat management",
      "High conductivity → heat flows easily (heat sinks, thermal bridges)",
      "Low conductivity → thermal insulation (envelopes, barriers)",
      "Material thermal properties drive distribution",
    ],
    examples: [
      "Heat sink: high thermal goal → conductive materials concentrate at heat source",
      "Envelope: low thermal goal → insulating materials form thermal break",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistryStiffnessGoal", "chemistrySolver"],
    workflowNotes: "Chemistry Thermal Goal controls heat flow through material selection. The solver positions high-conductivity or insulating materials based on thermal performance objectives.",
  },
};

export const getCommandDocumentation = (id: string): CommandDocumentation | undefined =>
  COMMAND_DOCUMENTATION[id];

export const getNodeDocumentation = (type: string): NodeDocumentation | undefined =>
  NODE_DOCUMENTATION[type];
