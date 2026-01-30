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
      "Select geometry in Roslyn before using",
      "Updates automatically when Roslyn geometry changes",
      "Use for bringing modeled shapes into parametric workflows",
    ],
    relatedNodes: ["geometryViewer", "geometryInfo"],
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
      "Connect any output to inspect values",
      "Shows lists with indices",
      "Edit fallback text when disconnected",
    ],
    relatedNodes: ["textNote", "geometryInfo"],
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
      "Drag handle or click to set value",
      "Set min/max to constrain range",
      "Connect to parameters for real-time control",
    ],
    examples: [
      "Control sphere radius parametrically",
      "Drive array count interactively",
    ],
    relatedNodes: ["number", "remap"],
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
      "Embedded mini viewport",
      "Accepts Filter input for display modes",
    ],
    relatedNodes: ["customPreview", "previewFilter"],
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
      "Evolutionary optimization",
      "Genomes encode parameters",
    ],
    relatedNodes: ["biologicalEvolutionSolver"],
  },
  biologicalEvolutionSolver: {
    tips: [
      "Full evolution with popup UI",
      "Connect Genome, Phenotype, Fitness",
    ],
    relatedNodes: ["genomeCollector", "geometryPhenotype", "performsFitness"],
  },
  physicsSolver: {
    tips: [
      "Structural analysis",
      "Connect Load and Anchor goals",
    ],
    relatedNodes: ["loadGoal", "anchorGoal", "stiffnessGoal"],
  },
  voxelSolver: {
    tips: [
      "Voxel topology optimization",
      "Wrapper around topologySolver",
    ],
    relatedNodes: ["topologySolver", "voxelizeGeometry"],
  },
  chemistrySolver: {
    tips: [
      "Multi-material optimization",
      "Particle-based simulation",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistryStiffnessGoal"],
  },

  // === GOALS: Physics ===
  stiffnessGoal: {
    tips: [
      "Defines stiffness targets",
      "Weight controls importance",
    ],
    relatedNodes: ["volumeGoal", "loadGoal", "physicsSolver"],
  },
  volumeGoal: {
    tips: [
      "Constrains material volume",
      "Fraction 0-1 sets budget",
    ],
    relatedNodes: ["stiffnessGoal", "topologySolver"],
  },
  loadGoal: {
    tips: [
      "Applies external forces",
      "Set vector and region",
    ],
    relatedNodes: ["anchorGoal", "physicsSolver"],
  },
  anchorGoal: {
    tips: [
      "Defines fixed supports",
      "Regions cannot move",
    ],
    relatedNodes: ["loadGoal", "physicsSolver"],
  },

  // === GOALS: Biological Evolution ===
  genomeCollector: {
    tips: [
      "Collects slider genes",
      "Connect sliders to evolve",
    ],
    relatedNodes: ["geometryPhenotype", "performsFitness", "biologicalEvolutionSolver"],
  },
  geometryPhenotype: {
    tips: [
      "Captures geometry outputs",
      "Defines what gets evaluated",
    ],
    relatedNodes: ["genomeCollector", "performsFitness"],
  },
  performsFitness: {
    tips: [
      "Aggregates metrics with weights",
      "Higher fitness = better",
    ],
    relatedNodes: ["genomeCollector", "geometryPhenotype"],
  },

  // === GOALS: Biological Growth ===
  growthGoal: {
    tips: [
      "Promotes biomass growth",
      "Intensity and direction",
    ],
    relatedNodes: ["nutrientGoal", "morphogenesisGoal", "biologicalSolver"],
  },
  nutrientGoal: {
    tips: [
      "Defines nutrient source",
      "Growth follows gradients",
    ],
    relatedNodes: ["growthGoal", "biologicalSolver"],
  },
  morphogenesisGoal: {
    tips: [
      "Shapes branching patterns",
      "Density and scale",
    ],
    relatedNodes: ["growthGoal", "homeostasisGoal"],
  },
  homeostasisGoal: {
    tips: [
      "Maintains stability",
      "Penalizes excess stress",
    ],
    relatedNodes: ["growthGoal", "morphogenesisGoal"],
  },

  // === GOALS: Chemistry ===
  chemistryMaterialGoal: {
    tips: [
      "Assigns material to geometry",
      "Select from library",
    ],
    relatedNodes: ["chemistryStiffnessGoal", "chemistrySolver"],
  },
  chemistryStiffnessGoal: {
    tips: [
      "Biases stiff materials to stress regions",
      "Weight controls priority",
    ],
    relatedNodes: ["chemistryMassGoal", "chemistrySolver"],
  },
  chemistryMassGoal: {
    tips: [
      "Minimizes material mass",
      "Balance with stiffness",
    ],
    relatedNodes: ["chemistryStiffnessGoal", "chemistrySolver"],
  },
  chemistryBlendGoal: {
    tips: [
      "Enforces smooth gradients",
      "Prevents sharp boundaries",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistrySolver"],
  },
  chemistryTransparencyGoal: {
    tips: [
      "Biases transparent materials",
      "For optical regions",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistrySolver"],
  },
  chemistryThermalGoal: {
    tips: [
      "Optimizes thermal conductivity",
      "Heat paths and barriers",
    ],
    relatedNodes: ["chemistryMaterialGoal", "chemistrySolver"],
  },
};

export const getCommandDocumentation = (id: string): CommandDocumentation | undefined =>
  COMMAND_DOCUMENTATION[id];

export const getNodeDocumentation = (type: string): NodeDocumentation | undefined =>
  NODE_DOCUMENTATION[type];
