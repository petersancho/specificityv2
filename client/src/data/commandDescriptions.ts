import { PRIMITIVE_CATALOG } from "./primitiveCatalog";

/**
 * Comprehensive descriptions for all primitive geometry commands.
 * Each primitive can be placed interactively on the C-Plane with size control.
 */
const PRIMITIVE_COMMAND_DESCRIPTIONS = Object.fromEntries(
  PRIMITIVE_CATALOG.map((entry) => {
    // Generate rich descriptions based on primitive type
    const descriptions: Record<string, string> = {
      box: "Create a rectangular box aligned to the C-Plane. Click to set the base corner, drag to define width and depth, then drag up to set height. Type exact dimensions (W,D,H) for precision. Useful as a starting point for Boolean operations or as architectural massing.",
      sphere: "Create a sphere centered on the C-Plane. Click to place center, drag outward to set radius. Type a value for exact sizing. Spheres are ideal for organic forms, ball joints, or Boolean sculpting operations.",
      cylinder: "Create a cylinder standing on the C-Plane. Click to set base center, drag for radius, then drag up for height. Perfect for columns, pipes, or mechanical parts. Combine with Boolean for creating holes.",
      torus: "Create a torus (donut shape) on the C-Plane. Click to place center, drag for major radius (ring size), then adjust tube radius. Great for rings, handles, O-rings, and decorative elements.",
      pyramid: "Create a square pyramid on the C-Plane. Click to set base center, drag for base size, then drag up for apex height. Useful for architectural roofs, gems, or decorative finials.",
      tetrahedron: "Create a tetrahedron (4-faced triangular pyramid). Click to place, drag to size. The simplest Platonic solid - useful for molecular models, dice, or abstract sculptures.",
      octahedron: "Create an octahedron (8-faced diamond shape). Click to place center, drag to size. Two square pyramids joined base-to-base. Great for gems, ornaments, or symmetric designs.",
      icosahedron: "Create an icosahedron (20-faced polyhedron). Click to place, drag to size. A Platonic solid with triangular faces - commonly used for dice (d20), virus models, or geodesic approximations.",
      dodecahedron: "Create a dodecahedron (12 pentagonal faces). Click to place, drag to size. A Platonic solid useful for specialized dice, decorative objects, or mathematical visualization.",
      hemisphere: "Create a hemisphere (half sphere) flat on the C-Plane. Click to place center, drag for radius. Ideal for domes, bowls, lens shapes, or architectural cupolas.",
      capsule: "Create a capsule (cylinder with hemispherical caps). Click to place, drag for radius and height. Perfect for pills, tanks, rounded containers, or character collision shapes.",
      disk: "Create a flat circular disk on the C-Plane. Click to place center, drag for radius. Use for plates, coins, circular bases, or as Boolean cutters for circular holes.",
      ring: "Create an annulus (ring with hole). Click to place center, drag for outer radius. Adjust inner radius parameter for ring thickness. Ideal for washers, frames, or decorative rings.",
      "triangular-prism": "Create a triangular prism on the C-Plane. Click to place, drag for size and height. A triangular cross-section extruded upward. Useful for Toblerone shapes, architectural supports, or wedge elements.",
      "hexagonal-prism": "Create a hexagonal prism (hex bolt shape). Click to place center, drag for radius and height. Common in mechanical design for nuts, bolts, and honeycomb structures.",
      "pentagonal-prism": "Create a pentagonal prism. Click to place, drag for size and height. A five-sided cross-section useful for unique architectural elements or abstract designs.",
      "torus-knot": "Create a torus knot (twisted loop). Click to place, drag to size. A complex curve that wraps around a torus surface. Fascinating for mathematical art, jewelry, or decorative elements.",
      "utah-teapot": "Create the classic Utah Teapot - a standard 3D graphics test model. Click to place, drag to size. The iconic benchmark object from computer graphics history.",
      frustum: "Create a frustum (truncated pyramid). Click to place, drag for base size and height. A pyramid with the top cut off - useful for lampshades, buckets, or architectural elements.",
      "mobius-strip": "Create a Möbius strip - a surface with only one side. Click to place, drag to size. The famous single-sided surface, perfect for mathematical visualization or artistic sculptures.",
      ellipsoid: "Create an ellipsoid (stretched sphere). Click to place, drag to size. Adjust aspect ratios for egg shapes, footballs, or planetary bodies.",
      wedge: "Create a wedge shape on the C-Plane. Click to place, drag for dimensions. A triangular prism lying on its side - useful for ramps, doorstops, or architectural details.",
      "spherical-cap": "Create a spherical cap (dome slice). Click to place, drag for radius. A portion of a sphere - ideal for domes, lens elements, or bowl-like forms.",
      bipyramid: "Create a bipyramid (two pyramids joined at base). Click to place, drag to size. A diamond-like shape useful for gems, crystals, or symmetric designs.",
      "rhombic-dodecahedron": "Create a rhombic dodecahedron (12 rhombus faces). Click to place, drag to size. Space-filling polyhedron useful for crystal models or tessellation.",
      "truncated-cube": "Create a truncated cube (cube with cut corners). Click to place, drag to size. An Archimedean solid with octagonal and triangular faces.",
      "truncated-octahedron": "Create a truncated octahedron. Click to place, drag to size. A space-filling Archimedean solid with hexagonal and square faces.",
      "truncated-icosahedron": "Create a truncated icosahedron (soccer ball shape). Click to place, drag to size. The classic football pattern with pentagons and hexagons - also called a Buckyball.",
      pipe: "Create a hollow pipe (cylinder with hole). Click to place, drag for outer radius. Set wall thickness parameter. Perfect for tubing, pipes, or cylindrical shells.",
      superellipsoid: "Create a superellipsoid (squircle-based 3D shape). Click to place, drag to size. Adjust exponents to morph between sphere, cylinder, and box. Versatile for organic-mechanical hybrid forms.",
      "hyperbolic-paraboloid": "Create a hyperbolic paraboloid (saddle surface). Click to place, drag to size. A doubly-curved surface sloping up in one direction and down in the other - iconic in modern architecture.",
      "geodesic-dome": "Create a geodesic dome. Click to place, drag for radius. A spherical structure made of triangular facets - famous from Buckminster Fuller's designs.",
      "one-sheet-hyperboloid": "Create a one-sheet hyperboloid (cooling tower shape). Click to place, drag to size. A ruled surface that curves in opposite directions - common in architecture and engineering.",
    };
    return [
      entry.id,
      {
        description: descriptions[entry.id] || `Click to place the base on the C-Plane, drag or type a size, then click to confirm the ${entry.label}. Esc cancels.`,
        category: "geometry",
      },
    ];
  })
);

/**
 * Semantic categories explain the general behavior and purpose of command groups.
 * These are displayed on detail pages to give users conceptual context.
 */
export const COMMAND_SEMANTICS: Record<string, string> = {
  geometry:
    "Creates or converts geometry directly in Roslyn using the active construction plane and cursor input. Geometry commands produce new objects that become part of your model, responding to snaps, grid settings, and the current C-Plane orientation. Use these commands to build the foundational shapes of your design.",
  transform:
    "Repositions, orients, or scales geometry by applying spatial transforms. Transform commands modify existing geometry while preserving its topology. They respond to selection state, pivot location, and gumball handles. Use transforms to arrange, align, and size your design elements.",
  edit:
    "Edits selection, clipboard, or history state without generating new geometry. Edit commands manage the workflow of your modeling session - copying, pasting, undoing, and organizing. They work with the current selection and system clipboard.",
  view:
    "Changes the camera frame, projection, or viewport focus for spatial clarity. View commands help you navigate your model, frame objects of interest, and set up views for presentation or detailed work. They don't modify geometry - only how you see it.",
  performs:
    "Runs a modeling action on the current selection, emphasizing procedural intent over manual edits. Performs commands execute operations that may create, modify, or analyze geometry based on selection and parameters. They often open dialogs or require multiple inputs.",
};

/**
 * Comprehensive command descriptions with detailed usage instructions.
 * Each entry includes description, optional keyboard shortcut, and category.
 */
export const COMMAND_DESCRIPTIONS: Record<
  string,
  { description: string; shortcut?: string; category: string }
> = {
  // === GEOMETRY CREATION COMMANDS ===
  point: {
    description: "Click to place a point on the active C-Plane. Points serve as reference markers, construction guides, or inputs for other commands. Enable snaps (grid, vertex, endpoint) for precise placement. Multiple points can be placed in sequence - press Enter or double-click to exit. Points are lightweight objects that won't render as geometry but appear as small markers in the viewport.",
    shortcut: "V",
    category: "geometry",
  },
  line: {
    description: "Click start and end points to create line segments. Continue clicking to chain multiple connected segments. Each segment is a separate linear geometry. Use snaps for precise endpoints - vertex snap to connect to existing geometry, grid snap for regular spacing. Double-click or press Enter to finish the sequence. Lines can be used as input for Loft, Extrude, or converted to polylines.",
    shortcut: "L",
    category: "geometry",
  },
  polyline: {
    description: "Click to add vertices sequentially, creating a connected series of line segments as a single object. Polylines maintain vertex connectivity, making them ideal for profiles, paths, or boundaries. Right-click, Enter, or double-click to finish. The last point connects to form either an open polyline or closed polygon (if ending near the start). Use Tab to cycle through snap candidates.",
    shortcut: "P",
    category: "geometry",
  },
  rectangle: {
    description: "Click the first corner, then click or drag to the opposite corner to create an axis-aligned rectangle on the C-Plane. Type width,height (e.g., '10,5') in the command line for exact dimensions. Hold Shift while dragging to constrain to a square. Rectangles are closed polylines and can be used as extrusion profiles, trim boundaries, or Boolean operands.",
    shortcut: "R",
    category: "geometry",
  },
  circle: {
    description: "Click to place the center point, then click or drag to set the radius. Type a numeric value for exact radius. Circles are created on the active C-Plane and can be used as profiles for Extrude, Loft, or Surface commands. For ellipses, use the Circle command then Scale non-uniformly. Hold Shift while sizing for diameter snapping.",
    shortcut: "C",
    category: "geometry",
  },
  arc: {
    description: "Create circular arcs using three-point definition: click the start point, click the end point, then click a third point to define the arc's curvature (bulge). The arc passes through all three points. For precise arcs, use snaps on existing geometry. Arcs can be joined with lines to form complex profiles or converted to polylines for further editing.",
    shortcut: "A",
    category: "geometry",
  },
  curve: {
    description: "Create smooth NURBS curves by clicking control points. The curve is influenced by but doesn't necessarily pass through each point (except endpoints). More control points allow for more complex shapes. Right-click or double-click to finish. Adjust degree parameter for curve smoothness (higher = smoother). Curves are ideal for organic shapes, railings, or sweep paths.",
    category: "geometry",
  },
  nurbsbox: {
    description: "Create a NURBS (Non-Uniform Rational B-Spline) box with smooth, mathematically precise surfaces. Click to place the base on the C-Plane, drag to set dimensions. NURBS geometry supports exact surface evaluation and is preferred for CAD/CAM workflows. Can be converted to mesh for rendering or Boolean operations.",
    category: "geometry",
  },
  nurbssphere: {
    description: "Create a mathematically exact NURBS sphere. Click to place center, drag for radius. NURBS spheres have perfect curvature defined by control points and weights, making them suitable for precision manufacturing or high-quality renders. The surface can be trimmed, split, or used in advanced surface operations.",
    category: "geometry",
  },
  nurbscylinder: {
    description: "Create a NURBS cylinder with exact circular cross-section. Click to place base center, drag for radius and height. NURBS cylinders maintain mathematical precision for CAD workflows. Can be capped or left open for pipe-like geometry. Ideal for mechanical parts requiring exact tolerances.",
    category: "geometry",
  },
  ...PRIMITIVE_COMMAND_DESCRIPTIONS,

  // === GEOMETRY CONVERSION COMMANDS ===
  interpolate: {
    description: "Convert polylines into smooth NURBS curves by interpolating through all vertices. Unlike control-point curves, interpolated curves pass exactly through each original vertex. Select one or more polylines, then Run. Useful for converting traced outlines into smooth paths. The resulting curve maintains the original point positions while adding smooth curvature between them.",
    shortcut: "I",
    category: "geometry",
  },
  surface: {
    description: "Create a planar surface from a closed curve, polyline, or rectangle. The boundary curve must be closed and planar (all points on a single plane). Select the boundary profile, then Run. The resulting surface can be extruded, used as a Boolean operand, or trimmed. For non-planar boundaries, use Loft or other surface generation methods.",
    shortcut: "S",
    category: "geometry",
  },
  loft: {
    description: "Create a smooth surface that spans between two or more profile curves. Select curves in order (the sequence defines the surface direction). Curves should have similar point counts for best results. Options include straight, normal, or developable loft types. Lofting creates organic transitions between shapes - ideal for hulls, bottles, or ergonomic forms.",
    shortcut: "O",
    category: "geometry",
  },
  extrude: {
    description: "Extrude a profile curve or surface along a direction (default: C-Plane normal). Select the profile, then drag to set extrusion distance or type a value. Positive values extrude in the normal direction, negative values extrude opposite. Cap ends option creates a closed solid. Extruded geometry can be used in Boolean operations for additive/subtractive modeling.",
    shortcut: "E",
    category: "geometry",
  },
  meshconvert: {
    description: "Convert NURBS curves or surfaces into triangulated mesh geometry for rendering, export, or mesh-based editing. Select NURBS objects, then Run. Mesh density is controlled by tolerance settings. Higher tessellation produces smoother meshes but more triangles. Use this before exporting to formats like STL, OBJ, or for game engines.",
    category: "geometry",
  },
  breptomesh: {
    description: "Tessellate B-Rep (Boundary Representation) solids into renderable mesh geometry. B-Rep solids store exact mathematical surfaces; this command approximates them with triangles. Control mesh density through tolerance settings. Essential for visualization, 3D printing export, or mesh-based analysis workflows.",
    category: "geometry",
  },
  meshtobrep: {
    description: "Convert mesh geometry into B-Rep (Boundary Representation) solid format. Each mesh triangle becomes a B-Rep face. This enables topology-aware operations on mesh imports. Note: result is a triangle-soup B-Rep, not a higher-order surface. Use for Boolean operations or CAD interoperability.",
    category: "geometry",
  },
  nurbsrestore: {
    description: "Attempt to restore original NURBS geometry from meshes that were previously converted. Works best on recently converted objects that retain NURBS metadata. If metadata is unavailable, attempts surface fitting (less accurate). Use for round-tripping geometry through mesh-based workflows.",
    category: "geometry",
  },
  boolean: {
    description: "Perform Boolean operations (Union, Difference, Intersection) on solid geometry. Select target solids, choose operation type, then Run. Union combines volumes, Difference subtracts one from another, Intersection keeps only overlapping volume. Objects must be closed solids for reliable results. Use for additive/subtractive modeling, creating complex shapes from primitives.",
    category: "performs",
  },

  // === MESH EDITING COMMANDS ===
  meshmerge: {
    description: "Combine multiple selected meshes into a single mesh object. Vertices are not welded - the meshes are simply grouped. Use for organizing scene hierarchy or preparing combined exports. For actual geometric union, use Boolean operations. Merged meshes share a single transform but retain individual face/vertex data.",
    category: "geometry",
  },
  meshflip: {
    description: "Flip mesh normals and reverse triangle winding order. Fixes inside-out meshes that appear black or render incorrectly due to backface culling. Select meshes with inverted normals, then Run. All selected mesh faces will have their normals reversed. Use on imported meshes or after Boolean operations that may invert surfaces.",
    category: "geometry",
  },
  meshthicken: {
    description: "Add thickness to mesh surfaces by offsetting along normals. Select a mesh, set thickness value and side option (both, inside, outside). Creates a solid shell from a surface mesh. Boundary edges are automatically capped. Useful for 3D printing thin surfaces or creating hollow shells from solid forms.",
    category: "geometry",
  },

  // === TRANSFORM COMMANDS ===
  transform: {
    description: "Access the full transform gumball for comprehensive manipulation. Drag axis arrows to move, drag rotation rings to rotate, drag scale handles to resize. Click the center to switch between move/rotate/scale modes. Type values in the command line for precision. Works on single objects or selections. Transform operations respect the current pivot point.",
    shortcut: "T",
    category: "transform",
  },
  move: {
    description: "Translate selected geometry along one or more axes. Drag gumball axis arrows for constrained movement, or click and drag freely for plane movement. Type 'X,Y,Z' values for precise displacement from current position. Movement is relative to world or local coordinates based on gumball orientation. Use snaps for aligning to grid or other geometry.",
    shortcut: "G",
    category: "transform",
  },
  rotate: {
    description: "Rotate selected geometry around an axis. Drag the corresponding rotation ring (red=X, green=Y, blue=Z) or type an angle value in degrees. Rotation occurs around the current pivot point - adjust pivot first if needed. Hold Shift for 15° angle snapping. Positive angles rotate counter-clockwise when looking down the axis.",
    shortcut: "⌘R",
    category: "transform",
  },
  scale: {
    description: "Scale selected geometry uniformly or per-axis. Drag corner handles for uniform scale, edge handles for single-axis scale, or type scale factors. Scale of 2 doubles size, 0.5 halves it. Scaling occurs from the pivot point - center pivot for symmetric scaling. Hold Shift for uniform scaling when dragging non-uniform handles.",
    shortcut: "⌘S",
    category: "transform",
  },
  offset: {
    description: "Offset selected curves by a perpendicular distance. Select curves, enter offset distance (positive = outward, negative = inward based on curve direction). Creates parallel copies of the original curves. Self-intersecting offsets are automatically trimmed. Use for creating wall thicknesses, margins, or concentric patterns.",
    category: "transform",
  },
  mirror: {
    description: "Create a mirrored copy of selected geometry across a plane. Click two points to define the mirror axis on the C-Plane, or select a plane object. Original geometry can be kept or deleted. Perfect for symmetric designs - model half, then mirror. Mirror preserves topology but reverses face normals (auto-corrected).",
    shortcut: "M",
    category: "transform",
  },
  array: {
    description: "Create multiple copies of selection arranged in a pattern. Linear array: set direction vector, count, and spacing. Polar array: set center, count, and angle. Grid array: set X/Y counts and spacing. Copies are independent objects (not instances). Use for repetitive elements like columns, steps, or patterns.",
    category: "transform",
  },
  gumball: {
    description: "Toggle the gumball widget for direct manipulation of selected geometry. The gumball provides axis arrows (move), rings (rotate), and handles (scale) centered on the selection. Drag to transform interactively. Double-click gumball center to enter numeric input mode. Click outside to confirm, Esc to cancel current transform.",
    shortcut: "W",
    category: "transform",
  },
  morph: {
    description: "Sculpt and deform geometry interactively using brush-based morphing. Select target geometry, then click-drag on the surface to push, pull, or smooth. Adjust brush size and strength. Works on mesh geometry for organic sculpting workflows. Use for terrain modeling, character sculpting, or freeform surface adjustment.",
    category: "transform",
  },

  // === EDIT COMMANDS ===
  undo: {
    description: "Undo the most recent action, restoring the previous state. Multiple undos step backward through action history. Undo works for geometry creation, transforms, deletions, and parameter changes. History depth is limited - very old actions may not be undoable. Some operations (like file saves) cannot be undone.",
    shortcut: "⌘Z",
    category: "edit",
  },
  redo: {
    description: "Redo the last undone action, restoring the state before undo. Only available after using undo. Multiple redos step forward through the redo stack. Making new changes clears the redo history. Use to recover accidentally undone work or toggle between before/after states.",
    shortcut: "⌘⇧Z",
    category: "edit",
  },
  copy: {
    description: "Copy selected geometry to the system clipboard. Copied objects can be pasted in the current session, other Roslyn documents, or other applications that accept geometry data. Copy captures full geometry data including transforms and materials. Selection is preserved after copying.",
    shortcut: "⌘C",
    category: "edit",
  },
  paste: {
    description: "Paste geometry from the clipboard into the scene. Choose placement mode: 'In Place' preserves original coordinates, 'At Cursor' places at click location, 'At Origin' places at world origin. Pasted objects are new independent copies. Can paste from other applications if clipboard contains compatible geometry data.",
    shortcut: "⌘V",
    category: "edit",
  },
  duplicate: {
    description: "Create an exact copy of selected geometry at the same location. Faster than copy-paste for in-document duplication. Duplicates are independent objects - changes to original don't affect duplicates. Alt-drag also duplicates while moving. Use for creating variations or backup copies before destructive edits.",
    shortcut: "⌘D",
    category: "edit",
  },
  delete: {
    description: "Remove selected geometry from the scene permanently. Deleted objects go to trash and can be recovered with Undo. Multiple objects can be deleted at once. Delete works on any selectable element including points, curves, surfaces, and meshes. Deleting grouped objects removes the entire group.",
    shortcut: "⌫",
    category: "edit",
  },
  cancel: {
    description: "Cancel the currently active command or operation without committing changes. Returns to the default selection state. Any preview geometry is removed. Use when you've started a command but want to abort without making changes. Does not undo committed changes (use Undo for that).",
    shortcut: "Esc",
    category: "edit",
  },
  confirm: {
    description: "Confirm and commit the currently active command or operation. Finalizes geometry creation, transform application, or parameter changes. Most commands can also be confirmed by pressing Enter or double-clicking. Use when ready to accept the current preview state.",
    shortcut: "↵",
    category: "edit",
  },

  // === VIEW COMMANDS ===
  focus: {
    description: "Frame the camera to fit the current selection in the viewport. Zooms and centers the view on selected objects with appropriate margin. If nothing is selected, frames all visible geometry. Use to quickly navigate to objects of interest. Does not change camera orientation, only position and zoom.",
    shortcut: "F",
    category: "view",
  },
  frameall: {
    description: "Frame the camera to fit all visible geometry in the viewport. Zooms out to show the entire scene with comfortable margins. Ignores hidden or isolated objects. Use after zooming in to regain overview, or when opening a file to see full contents. Keyboard shortcut: Shift+F.",
    shortcut: "⇧F",
    category: "view",
  },
  screenshot: {
    description: "Capture the current viewport as an image file. Opens export preview with options for resolution, format (PNG, JPG, WebP), and background transparency. Renders the current view including all visible geometry, grid, and UI elements (optionally). Saved images can be used for documentation, presentations, or sharing.",
    category: "view",
  },
  view: {
    description: "Switch between standard orthographic views (Top, Front, Right, Back, Left, Bottom) or Perspective view. Orthographic views show parallel projection without perspective distortion - useful for precise alignment and measurement. Perspective view shows realistic depth. Click again to cycle through options.",
    category: "view",
  },
  camera: {
    description: "Access camera settings and navigation options. Toggle 'Zoom to Cursor' for zoom centered on mouse position. 'Invert Zoom' reverses scroll direction. 'Keep Upright' prevents camera roll during orbit. Adjust field of view for perspective distortion. Camera settings persist across sessions.",
    category: "view",
  },
  pivot: {
    description: "Set the transform pivot point location. Choose mode: 'Object Center' (bounding box center), 'Object Origin' (object's local origin), 'World Origin', 'Selection Center', or 'Custom' (click to place). Pivot affects rotation and scale operations. Red crosshair shows current pivot location.",
    category: "view",
  },
  orbit: {
    description: "Orbit the camera around the scene pivot point. Click and drag with right mouse button to orbit freely. Orbiting rotates the camera while keeping it pointed at the center of interest. Shift+orbit for pan, Ctrl+orbit for zoom. The orbit center is shown as a small indicator in the viewport.",
    category: "view",
  },
  pan: {
    description: "Pan the camera parallel to the view plane. Middle-click and drag, or Shift+right-click and drag. Panning moves the view laterally without changing zoom or angle. Useful for exploring geometry without changing perspective. Pan speed scales with zoom level for consistent feel.",
    category: "view",
  },
  zoom: {
    description: "Zoom the camera in or out. Scroll wheel for smooth zoom, or use zoom handles in the navigation controls. Zoom centers on cursor position when 'Zoom to Cursor' is enabled. Double-click with zoom tool for zoom-to-fit. Zoom range is limited to prevent extreme near/far clipping.",
    category: "view",
  },
  display: {
    description: "Change viewport display mode. Options: Wireframe (edges only), Shaded (smooth surfaces), Shaded+Edges (both), Ghosted (transparent), Silhouette (outline only). Display modes affect visualization only, not geometry. Different modes reveal different aspects - use Wireframe for topology, Shaded for form.",
    category: "view",
  },
  isolate: {
    description: "Isolate or hide selected geometry for focused editing. 'Isolate' hides everything except selection. 'Hide' hides only the selection. 'Show All' reveals hidden objects. 'Lock' prevents selection/editing while visible. Isolation state persists until explicitly cleared. Essential for working on complex models.",
    category: "view",
  },

  // === UTILITY COMMANDS ===
  selectionfilter: {
    description: "Set the selection filter to control what types of elements can be selected. Options: Object (whole objects), Vertex (mesh/control points), Edge (curve/mesh edges), Face (mesh faces). Filters help precise selection in complex scenes. Filter state shown in status bar. Reset to Object for general use.",
    category: "performs",
  },
  cycle: {
    description: "Cycle through overlapping objects under the cursor. When multiple objects occupy the same screen space, clicking selects the frontmost. Use Tab or Cycle command to select the next object behind. Continue cycling to reach deeply buried objects. Visual highlight shows current candidate before selection.",
    shortcut: "Tab",
    category: "performs",
  },
  snapping: {
    description: "Configure snap settings for precise geometry placement. Toggle snap types: Grid (regular intervals), Vertex (geometry points), Endpoint (curve ends), Midpoint (curve centers), Intersection (curve crossings), Perpendicular, Tangent. Multiple snaps can be active simultaneously. Snap indicators appear when active.",
    category: "performs",
  },
  grid: {
    description: "Configure the construction grid for the active C-Plane. Set spacing (major/minor divisions), units, and extent. Toggle 'Adaptive Grid' for automatic spacing based on zoom level. Grid provides visual reference and snap targets. Grid visibility can be toggled independently of snap behavior.",
    category: "performs",
  },
  cplane: {
    description: "Set the active Construction Plane for 2D geometry creation. Choose preset planes (World XY, XZ, YZ) or define custom plane by clicking 3 points (origin, X-direction, Y-direction). The C-Plane determines where new geometry is created and how coordinates are interpreted in commands.",
    category: "performs",
  },
  outliner: {
    description: "Open the Outliner panel for scene hierarchy management. View all objects organized by type, layer, or group. Select objects by clicking names. Toggle visibility, lock state, and isolation per object. Rename objects for organization. Drag to reorder or group. Essential for managing complex scenes.",
    category: "performs",
  },
  tolerance: {
    description: "Set modeling tolerance values for geometry operations. Absolute tolerance (distance threshold for coincident points), Angle tolerance (degrees for tangent/smooth detection). Tighter tolerances produce more accurate but computationally expensive results. Adjust based on model scale and precision needs.",
    category: "performs",
  },
  status: {
    description: "Toggle the status bar visibility and configure its display options. The status bar shows current command prompts, cursor coordinates, selection info, and snap status. Helpful for learning commands and confirming precise values. Can be positioned at top or bottom of viewport.",
    category: "performs",
  },
};
