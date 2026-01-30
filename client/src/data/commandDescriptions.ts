import { PRIMITIVE_CATALOG } from "./primitiveCatalog";

/**
 * Primitive command descriptions - generated from the catalog with rich semantic context.
 * Each primitive represents a fundamental geometric form with specific mathematical properties.
 */
const PRIMITIVE_COMMAND_DESCRIPTIONS = Object.fromEntries(
  PRIMITIVE_CATALOG.map((entry) => [
    entry.id,
    {
      description: `Creates a ${entry.label}—one of the fundamental geometric primitives available in Roslyn. Click on the C-Plane to place the base position, drag or type values to set dimensions, then click to confirm the shape. The ${entry.label} is created as mesh geometry with clean topology suitable for further modeling operations including Boolean combinations, subdivision, and mesh editing. Use primitives as building blocks for constructive modeling, as Boolean operands for carving and combining, or as starting forms for detailed design development. Press Esc at any point to cancel without creating geometry.`,
      category: "geometry",
    },
  ])
);

/**
 * Category-level semantic descriptions shown on detail pages.
 * These provide ontological context for each command category within the Roslyn modeling paradigm.
 */
export const COMMAND_SEMANTICS: Record<string, string> = {
  geometry:
    "Geometry commands create new objects in your model by translating cursor input, typed coordinates, and snap targets into precise geometric forms. All geometry creation respects the active Construction Plane (C-Plane), which acts as the working surface for 2D input. Points define locations, curves define paths and boundaries, surfaces define spans, and solids define volumes. Geometry commands are the primary means of authoring form in Roslyn—they turn design intent into mathematical objects that can be transformed, analyzed, and fabricated.",
  transform:
    "Transform commands modify the position, orientation, and scale of existing geometry without changing its topological structure. Move translates, Rotate spins, Scale resizes, Mirror flips, and Array replicates. Transforms operate relative to a pivot point (the reference center) and can be constrained to axes, planes, or custom directions. The gumball widget provides interactive transform handles directly on selected geometry. Transform commands are non-destructive to shape—they preserve the object's identity while changing its spatial configuration.",
  edit:
    "Edit commands manage the workflow state of your modeling session: selection, clipboard, and history. They don't create or modify geometry directly but control how you interact with existing objects. Copy/Paste enables geometry replication across contexts, Undo/Redo enables exploration without fear of mistakes, Delete removes objects, and selection filters control what can be picked. Edit commands embody the principle that good tools should make experimentation safe and iteration fast.",
  view:
    "View commands control how you see your model without affecting the geometry itself. Camera navigation (orbit, pan, zoom) positions your viewpoint, standard views (Top, Front, Right, Perspective) provide canonical orientations, display modes (wireframe, shaded, ghosted) reveal different aspects of form, and framing operations focus attention on relevant geometry. View commands separate visualization from modeling—you can see your design from any angle without changing it.",
  performs:
    "Performs commands execute modeling operations that act on selections or system state. Unlike geometry commands (which create from input) or transforms (which modify position), performs commands apply algorithmic operations: Boolean combinations, mesh conversions, surface analysis, or system configuration. They're the 'verbs' of computational design—operations that take existing geometry and produce new results through calculation.",
};

/**
 * Complete command descriptions with shortcuts and categories.
 * Every command ID from registry.ts must have an entry here.
 */
export const COMMAND_DESCRIPTIONS: Record<
  string,
  { description: string; shortcut?: string; category: string }
> = {
  // === GEOMETRY: Points & Curves ===
  point: {
    description: "Places a point—the atomic element of geometry—at a clicked location on the active C-Plane. Points define pure position without extent: they're construction references, curve control vertices, attractor centers, or snap targets. Enable vertex or intersection snaps for precise placement on existing geometry. Points are invisible in rendered output but essential for design logic. Type exact coordinates in the command line for numeric precision, or click freely for gestural placement.",
    shortcut: "V",
    category: "geometry",
  },
  line: {
    description: "Creates straight line segments by clicking start and end points on the active C-Plane. Each click pair defines one segment; continue clicking to chain multiple segments. Lines are individual entities (not connected like polyline vertices). Hold Shift to constrain to orthogonal directions. Double-click or press Enter to finish without adding more segments. Lines serve as construction geometry, measurement references, extrusion paths, or structural edges. Enable endpoint snaps to connect to existing geometry.",
    shortcut: "L",
    category: "geometry",
  },
  polyline: {
    description: "Creates a connected sequence of straight segments through clicked vertices. Each click adds a vertex; the path flows through all points in order. Right-click or press Enter to finish as an open polyline; click near the first point to close the shape into a polygon. Polylines are fundamental for architectural outlines, floor plans, profiles for extrusion, or any rectilinear path. Convert to smooth curves with Interpolate, offset for wall thickness, or extrude into 3D volumes.",
    shortcut: "P",
    category: "geometry",
  },
  rectangle: {
    description: "Creates a four-sided closed polyline with right-angle corners, defined by two opposite corners or by center and size. Click the first corner, then the diagonal opposite corner to size dynamically, or type width,height in the command line for exact dimensions. Hold Shift to constrain to a square. Rectangles lie on the active C-Plane and are axis-aligned to that plane's orientation. Use rectangles for floor outlines, window openings, panel boundaries, or any orthogonal profile.",
    shortcut: "R",
    category: "geometry",
  },
  circle: {
    description: "Creates a perfect circular NURBS curve with mathematically exact curvature. Click to place the center point, then drag or type a radius value to set the size. The circle lies on the active C-Plane. Unlike mesh circle approximations, this NURBS circle has infinite precision—it's the geometric ideal of circularity. Use circles as profiles for cylindrical extrusions, as trim boundaries for openings, as construction references, or as the base for arc extraction.",
    shortcut: "C",
    category: "geometry",
  },
  arc: {
    description: "Creates a circular arc segment using three-point definition: start point, end point, and a point that defines the arc's bulge direction and curvature. The arc passes through the start and end points, with its curvature determined by how far the third point pulls it from the straight line. Arcs have constant radius—they're sections of perfect circles. Use arcs for rounded corners, cam profiles, architectural arches, or any design requiring partial circular geometry.",
    shortcut: "A",
    category: "geometry",
  },
  curve: {
    description: "Creates a freeform NURBS curve influenced by clicked control points. Unlike polylines (which pass through vertices), NURBS curves are attracted toward control points without necessarily touching them—the curve flows smoothly near the control polygon. Click to place control points, building the curve's influence shape. Right-click or double-click to finish. The degree parameter (in advanced settings) controls curve smoothness: degree 2 is quadratic, degree 3 is cubic (most common for design curves). NURBS curves are the standard for professional organic design.",
    category: "geometry",
  },

  // === GEOMETRY: NURBS ===
  nurbsbox: {
    description: "Creates a box primitive using NURBS surface representation instead of mesh facets. Each face is a mathematically exact planar NURBS surface with precise corner curves. NURBS boxes maintain perfect edge geometry through transformations and Boolean operations—there's no mesh approximation error. Use NURBS primitives when precision matters: for CAD interchange, for operations requiring exact surface evaluation, or when downstream processes need analytical geometry rather than tessellated approximations.",
    category: "geometry",
  },
  nurbssphere: {
    description: "Creates a sphere using exact NURBS surface definition rather than triangulated mesh approximation. The NURBS sphere has mathematically perfect curvature at every point—it's the geometric ideal of sphericity. Unlike mesh spheres (which are always faceted approximations), NURBS spheres can be evaluated at any parameter to get precise positions and normals. Use for precision modeling, for operations requiring exact spherical geometry, or when the sphere will be trimmed or combined with other NURBS surfaces.",
    category: "geometry",
  },
  nurbscylinder: {
    description: "Creates a cylinder using exact NURBS surface definition with mathematically perfect circular cross-section. The cylindrical surface is analytically defined—no matter how closely you zoom, the roundness is exact. Use NURBS cylinders for precision modeling, for Boolean operations requiring exact cylinder-plane intersections, or for any workflow where downstream processes need analytical geometry. The caps are optional planar NURBS surfaces completing the solid.",
    category: "geometry",
  },

  // === GEOMETRY: Primitives (from catalog) ===
  ...PRIMITIVE_COMMAND_DESCRIPTIONS,

  // === GEOMETRY: Conversion ===
  interpolate: {
    description: "Transforms a polyline into a smooth NURBS curve that passes through the original vertices, converting sharp corners into flowing curves. Unlike the Curve command (which uses control points that the curve is attracted to but doesn't touch), Interpolate creates curves that actually touch every original vertex. The resulting curve is tangent-continuous, meaning it has no sudden direction changes. Use Interpolate to convert traced outlines into smooth profiles, to soften hand-drawn polylines, or to create organic curves from precisely positioned vertices.",
    shortcut: "I",
    category: "geometry",
  },
  surface: {
    description: "Creates a surface that fills a closed boundary curve, spanning the enclosed area like fabric stretched across a frame. For planar curves, the result is a flat trimmed surface. For non-planar curves, the system attempts to find a minimal-area spanning surface. Select one or more closed curves that define the boundary, then run the command. Surface creation is the gateway from 2D curves to 3D form—floor plates from outlines, infill panels from frames, or any design requiring bounded surfaces.",
    shortcut: "S",
    category: "geometry",
  },
  loft: {
    description: "Creates a surface by smoothly connecting a sequence of profile curves, like draping fabric between ribs or creating a skin over a skeleton. Select profiles in order from one end to the other—curve direction and sequence determine surface flow. Lofting handles profiles of different shapes, creating smooth transitions between varied cross-sections. Use for: boat hulls, furniture legs, building facades that morph between floors, or any form that flows through defined sections. Options control tangent continuity at profiles for smoother or more controlled transitions.",
    shortcut: "O",
    category: "geometry",
  },
  extrude: {
    description: "Pushes curves or surfaces along a direction to create 3D form—the most fundamental 2D-to-3D operation in CAD. Select profiles, then drag to set extrusion distance or type a value for precision. By default, extrusion follows the C-Plane normal (perpendicular to the drawing surface), but you can specify custom directions. The Cap option determines whether the extrusion ends are closed (creating a solid) or open (creating a shell). Extrusion is how floor plans become walls, how sections become volumes, and how profiles become beams.",
    shortcut: "E",
    category: "geometry",
  },
  boolean: {
    description: "Performs constructive solid geometry operations that combine, subtract, or intersect solid volumes. Three operations are available: Union merges solids into one (adding material), Difference subtracts the second solid from the first (carving out material), and Intersection keeps only the overlapping volume (masking). Select two or more closed solids, choose the operation, and run. Boolean operations are the foundation of constructive modeling—complex forms built from primitive combinations. Both inputs must be closed, watertight geometry.",
    category: "performs",
  },

  // === GEOMETRY: Mesh Operations ===
  meshconvert: {
    description: "Converts NURBS curves, surfaces, and B-Rep solids into mesh (triangulated) geometry. This is the bridge between precise mathematical geometry and discrete faceted representation. Curves become pipe meshes, surfaces become triangulated approximations, and solids become watertight triangle meshes. Conversion is necessary before mesh-based operations (Boolean, subdivision, export to STL) or when geometry needs to be displayed with consistent faceting. Tessellation parameters control the trade-off between accuracy and polygon count.",
    category: "geometry",
  },
  breptomesh: {
    description: "Tessellates B-Rep (Boundary Representation) solid geometry into triangle mesh format. B-Rep is the precise CAD representation where solids are defined by trimmed surface patches with exact mathematical definitions. Tessellation samples these surfaces to create a mesh approximation suitable for visualization, export, and mesh-based editing. Face boundaries are preserved where possible. Control mesh density through tessellation settings—finer tessellation captures detail but creates heavier geometry.",
    category: "geometry",
  },
  meshtobrep: {
    description: "Elevates mesh geometry into B-Rep (Boundary Representation) format, enabling topology-aware operations like precise Booleans and CAD-style editing. Each mesh triangle becomes a planar B-Rep face with exact geometric definition. This is particularly useful for imported STL files or scanned geometry that needs to participate in solid modeling operations. Note: the result is 'triangle soup'—the B-Rep accurately represents the mesh triangles but doesn't recover smooth surfaces or original design intent.",
    category: "geometry",
  },
  nurbsrestore: {
    description: "Attempts to restore NURBS surface definitions from geometry that was previously converted to mesh. This works best for recently-converted geometry where the original NURBS structure can be inferred from the mesh tessellation pattern. For meshes that originated as NURBS and haven't been heavily modified, NURBS Restore can recover smooth surface definitions. For arbitrary meshes (scans, imports), the restoration is more approximate. Use when you need to recover analytical precision from tessellated geometry.",
    category: "geometry",
  },
  meshmerge: {
    description: "Combines multiple selected mesh objects into a single unified mesh, joining their vertices, faces, and edges into one entity. This is different from Boolean Union (which creates watertight combinations)—Mesh Merge simply concatenates geometry without analyzing intersections. Use Mesh Merge to: consolidate imported parts, prepare geometry for export as a single file, reduce object count for performance, or create assemblies from separate components. The merged result maintains all original geometry.",
    category: "geometry",
  },
  meshflip: {
    description: "Reverses the normal direction of mesh faces, fixing 'inside-out' geometry where surfaces face the wrong direction. Mesh normals determine which side is considered 'outside' for rendering, lighting calculations, and solid operations. When imported meshes or Boolean results have inverted normals (appearing black, with wrong shading, or failing solid tests), Mesh Flip corrects the orientation. The command can flip all faces or selected faces, and can unify inconsistent normal directions.",
    category: "geometry",
  },
  meshthicken: {
    description: "Transforms a surface mesh into a solid by extruding faces along their normal directions and stitching the boundaries, creating a shell with specified thickness. Input a single-surface mesh (like a sheet or panel), set the thickness distance, and the command generates a watertight solid with offset surfaces. This is essential for preparing thin surfaces for 3D printing, creating wall thickness from single surfaces, or generating structural shells from form-finding results. Cap options control whether edges are closed.",
    category: "geometry",
  },

  // === TRANSFORM ===
  transform: {
    description: "Activates the gumball widget on selected geometry, providing interactive handles for move, rotate, and scale operations in one unified interface. Drag axis arrows to move along constrained directions, drag rotation rings to spin around axes, and drag scale handles to resize. The gumball centers on the pivot point (configurable). Click away or press Enter to confirm transformations. This is the primary direct-manipulation tool for spatial adjustment—faster than separate move/rotate/scale commands for iterative design.",
    shortcut: "T",
    category: "transform",
  },
  move: {
    description: "Translates selected geometry by a displacement vector, shifting position without changing orientation or size. Drag axis handles to constrain movement to X, Y, or Z directions, or drag freely to move in any direction. Type exact displacement values in the command line for precision: 'x,y,z' or just 'z' for vertical movement. Move is fundamental for positioning—placing objects in assembly, aligning components, or adjusting layout. The operation is relative: geometry shifts by the specified amount from its current position.",
    shortcut: "G",
    category: "transform",
  },
  rotate: {
    description: "Rotates selected geometry around an axis through the pivot point. Drag rotation rings to spin interactively, or type an exact angle value in degrees. The rotation axis can be X, Y, Z (world coordinates), or perpendicular to the current view. Hold Shift to constrain to 15° increments for precise angles. Rotation is fundamental for: orienting components, creating radial patterns, tilting surfaces, or adjusting assembly positions. Set the pivot location before rotating to control the rotation center.",
    shortcut: "⌘R",
    category: "transform",
  },
  scale: {
    description: "Resizes selected geometry relative to the pivot point, multiplying dimensions by scale factors. Drag scale handles to resize interactively—corner handles scale uniformly, edge handles scale along single axes. Type exact scale factors: '2' doubles size, '0.5' halves it, '1,1,2' doubles only the Z dimension. Hold Shift to constrain to uniform scaling (maintaining proportions). Scale is essential for: fitting geometry to constraints, creating size variations, or adjusting proportions. Negative factors mirror while scaling.",
    shortcut: "⌘S",
    category: "transform",
  },
  offset: {
    description: "Creates a parallel copy of curves displaced by a perpendicular distance, maintaining consistent spacing from the original. Positive values offset in the normal direction (typically outward for closed curves), negative values offset inward. The command handles self-intersections that occur when tight curves offset past their radius of curvature. Offset is fundamental for: creating wall thickness from centerlines, generating concentric patterns, defining margins and clearances, or building stepped profiles. For surfaces, use Offset Surface instead.",
    category: "transform",
  },
  mirror: {
    description: "Creates a reflected copy of selected geometry across a mirror plane, producing bilateral symmetry. Click two points to define the mirror axis on the C-Plane, or select an existing line as the reflection axis. Mirror is essential for: creating symmetrical designs from half-models, generating reflected components, or checking design balance. The original geometry is preserved by default; use 'Delete original' option to replace with the mirrored copy. Mirror respects the active C-Plane for plane definition.",
    shortcut: "M",
    category: "transform",
  },
  array: {
    description: "Creates multiple copies of selected geometry arranged along a vector or in patterns. Linear array distributes copies along a direction with specified spacing and count. Polar array arranges copies in a circular pattern around an axis. Grid array creates 2D or 3D matrices of copies. Array is fundamental for: columns along a facade, radial patterns like wheel spokes, repetitive structural elements, or any design requiring regular replication. Array instances can be linked (all update together) or independent.",
    category: "transform",
  },
  gumball: {
    description: "Toggles the visibility of the gumball transform widget on selected geometry. When enabled, the gumball appears centered on selections, providing interactive handles for move (arrows), rotate (rings), and scale (boxes). The gumball is the primary direct-manipulation interface—grab and drag handles to transform intuitively. When disabled, selection highlights appear without transform handles. The gumball position follows the pivot setting. Use gumball for quick, visual adjustments; use separate transform commands for precise numeric control.",
    shortcut: "W",
    category: "transform",
  },
  morph: {
    description: "Enables brush-based sculpting deformation on mesh geometry, allowing freeform manipulation by pushing, pulling, or smoothing vertices. Click and drag on mesh surfaces to deform—the brush affects vertices within its radius, with falloff controlling the influence gradient. Morph tools include: Push (displace along view direction), Pull (attract toward brush), Smooth (average vertex positions), and Inflate (expand along normals). Morph is for organic modeling, artistic shaping, or fine-tuning imported geometry.",
    category: "transform",
  },

  // === EDIT ===
  undo: {
    description: "Reverses the most recent modeling action, restoring the model state to before that action occurred. Undo creates a safety net that makes experimentation risk-free—try aggressive operations knowing you can retreat. Repeat Undo to step progressively backward through history. The undo stack has a depth limit; very old actions eventually age out. Undo/Redo together enable exploration of alternatives: try one approach, undo, try another, compare. Undo is the foundation of fearless iteration.",
    shortcut: "⌘Z",
    category: "edit",
  },
  redo: {
    description: "Reverses the most recent Undo, restoring actions you stepped back from. If you Undo too far, Redo brings you forward again. Redo only works after Undo—once you perform a new action, the redo stack clears and that branch of history is gone. Use Undo/Redo together to compare different states: undo to see 'before,' redo to see 'after,' decide which to keep. Redo is the complement to Undo, completing the time-travel metaphor.",
    shortcut: "⌘⇧Z",
    category: "edit",
  },
  copy: {
    description: "Copies selected geometry to the clipboard without removing it from the scene, enabling duplication across locations or even across projects. Copied geometry includes all data: shape, position, properties, and metadata. Use Copy with Paste to duplicate objects: copy once, paste multiple times for repeated instances. Copy also works across Roslyn sessions—geometry can be transferred between projects via the system clipboard. Copy is non-destructive; originals remain in place.",
    shortcut: "⌘C",
    category: "edit",
  },
  paste: {
    description: "Inserts geometry from the clipboard into the scene. Options control placement: 'In Place' pastes at the original copied position, 'At Cursor' places at the current mouse location, 'At Origin' centers at world origin. Paste creates independent geometry—changes to pasted objects don't affect the originals. Use Copy+Paste for: duplicating elements across the model, transferring geometry between sessions, or creating variations from a base shape. Multiple pastes from one copy create multiple independent instances.",
    shortcut: "⌘V",
    category: "edit",
  },
  duplicate: {
    description: "Creates an immediate copy of selected geometry at the same location, combining Copy and Paste into one action. The duplicate is independent—modifications to it don't affect the original. Duplicate is the fastest way to create variations: duplicate a form, then modify the copy while the original serves as reference. The duplicate selection replaces the original selection, ready for transformation. Use Duplicate + Move/Transform for rapid iteration.",
    shortcut: "⌘D",
    category: "edit",
  },
  delete: {
    description: "Removes selected geometry from the model permanently. Deleted objects are gone from the scene but can be recovered with Undo. Delete is the cleanup tool—removing construction geometry, failed experiments, or obsolete elements. Select carefully before deleting; use Undo immediately if you remove the wrong objects. Delete also removes associated data like materials and layer assignments. For temporary hiding without deletion, use Isolate/Hide instead.",
    shortcut: "⌫",
    category: "edit",
  },
  cancel: {
    description: "Aborts the currently active command without committing any changes, returning to the idle selection state. Cancel is the escape hatch—if you start a command by mistake, if you don't like how an operation is going, or if you simply change your mind, Cancel cleanly exits without side effects. Preview geometry disappears, input state resets, and you're free to start fresh. Cancel is essential for fearless exploration—you can always back out.",
    shortcut: "Esc",
    category: "edit",
  },
  confirm: {
    description: "Commits the currently active command, finalizing any pending operations. After setting up a command's inputs (points, distances, options), Confirm executes the operation and creates or modifies geometry. Enter/Return is the natural confirmation—the gesture of 'yes, do this.' Some commands auto-confirm after receiving sufficient input; others wait for explicit confirmation. Confirm completes the command cycle: initiate, provide input, preview, confirm.",
    shortcut: "↵",
    category: "edit",
  },

  // === VIEW ===
  focus: {
    description: "Adjusts the viewport camera to frame the selected geometry, centering it in view with appropriate zoom level and margins. If nothing is selected, Focus frames all visible geometry. This is the 'go here' command—quickly navigate to objects of interest. Focus sets the orbit center to the framed geometry's center, making subsequent orbit operations revolve around the target. Use Focus to jump between areas of a large model or to examine specific details.",
    shortcut: "F",
    category: "view",
  },
  frameall: {
    description: "Adjusts the viewport camera to show all visible geometry in the scene, fitting everything into view with appropriate margins. Unlike Focus (which targets selection), Frame All encompasses the entire model. Use after importing, after significant modeling changes, or when you've lost your bearings in a large model. Frame All is the 'show me everything' command that provides the global view for orienting and navigating.",
    shortcut: "⇧F",
    category: "view",
  },
  screenshot: {
    description: "Captures the current viewport as an image file, preserving the exact view for documentation, presentation, or analysis. The command opens an export preview where you can choose resolution, format (PNG, JPG), and whether to include UI elements or just geometry. Screenshot creates static records of design states—use for project documentation, client presentations, social media, or comparing before/after states. Higher resolutions produce sharper images but larger files.",
    category: "view",
  },
  view: {
    description: "Switches between standard orthographic views (Top, Front, Right, Left, Back, Bottom) and Perspective view. Orthographic views show geometry without perspective distortion—parallel lines remain parallel—essential for accurate measurement and alignment. Perspective view shows depth through convergence, matching human visual experience. Each view has architectural conventions: Top is plan view, Front is elevation, Right is side elevation. Switch views to understand 3D forms from different angles.",
    category: "view",
  },
  camera: {
    description: "Opens camera settings for navigation behavior customization. Options include: 'Zoom to Cursor' centers zoom on the mouse pointer rather than screen center (essential for precision navigation), 'Invert Zoom' reverses scroll direction, and 'Keep Upright' prevents the camera from rolling during orbit. These preferences adapt navigation to your habits and hardware. Camera settings persist across sessions—configure once for consistent behavior.",
    category: "view",
  },
  pivot: {
    description: "Sets the pivot point location—the reference center for rotate and scale operations. Options include: 'Object Center' (geometry's bounding box center), 'World Origin' (0,0,0), 'Custom' (click to place), or 'Selection Center' (center of multiple selected objects). The pivot determines what point stays fixed during transformations. Setting the right pivot is essential for controlled rotation (spin around edge, not center) or scaling (grow from base, not middle). Pivot location is indicated by a crosshair marker.",
    category: "view",
  },
  orbit: {
    description: "Rotates the camera around the scene center (or focus point), letting you view geometry from different angles while maintaining distance. Right-click and drag to orbit interactively. Orbit is the primary 3D navigation mode—understanding form requires seeing it from multiple viewpoints. The orbit center can be set with Focus command or pivot settings. Orbit motion is constrained by camera settings; 'Keep Upright' prevents over-rotation that would flip the view.",
    category: "view",
  },
  pan: {
    description: "Slides the camera position parallel to the view plane, shifting what's visible without changing view direction or zoom level. Middle-click and drag, or Shift + right-click drag to pan. Pan is essential for: moving to off-center areas without changing zoom, examining large models section by section, or fine-adjusting framing. Combined with Orbit and Zoom, Pan completes the camera navigation toolkit—orbit for angle, zoom for distance, pan for position.",
    category: "view",
  },
  zoom: {
    description: "Adjusts camera distance from the scene, making geometry appear larger (zoom in) or smaller (zoom out). Scroll the mouse wheel to zoom; roll toward you to zoom in, away to zoom out. With 'Zoom to Cursor' enabled, zooming centers on the mouse position for precise navigation. Zoom controls the visible scale and detail level—zoom out for overview, zoom in for detail work. Combined with Pan and Orbit, Zoom completes the navigation system for exploring 3D space.",
    category: "view",
  },
  display: {
    description: "Switches the rendering mode that determines how geometry is visualized. Modes include: 'Shaded' (solid surfaces with lighting), 'Wireframe' (edges only, no surfaces), 'Ghosted' (transparent surfaces with visible edges), and 'Silhouette' (outline emphasis). Each mode reveals different aspects: shaded shows form, wireframe shows structure, ghosted shows internal relationships, silhouette emphasizes shape. Switch modes as needed for different analysis tasks. Display mode doesn't affect geometry—it's purely visual.",
    category: "view",
  },
  isolate: {
    description: "Temporarily hides all geometry except the current selection, focusing attention on specific objects by removing visual clutter. Run Isolate once to hide everything else; run again to restore visibility. Isolate is essential for: working on complex assemblies where nearby geometry interferes, examining internal components, or creating clean screenshots of specific elements. Hidden geometry is still there—it's just not visible. Use Show All to reveal everything regardless of isolation state.",
    category: "view",
  },

  // === UTILITY ===
  selectionfilter: {
    description: "Controls what types of geometry elements can be selected. Modes include: 'Object' (select whole objects), 'Vertex' (select individual points), 'Edge' (select individual edges), and 'Face' (select individual mesh faces). Selection filter determines interaction granularity—object mode for assembly work, sub-object modes for detailed editing. The current filter is indicated in the status bar. Combined with click-selection and box-selection, the filter controls what gets picked.",
    category: "performs",
  },
  cycle: {
    description: "Steps through overlapping objects under the cursor, allowing selection of obscured geometry. When multiple objects occupy the same screen position, click-selection normally picks the frontmost; Cycle advances to the next object beneath. Keep pressing Tab to step through all candidates. Cycle is essential for dense scenes where objects overlap—without it, you can't select what's behind. The cycle sequence repeats, looping back to the first object after the last.",
    shortcut: "Tab",
    category: "performs",
  },
  snapping: {
    description: "Configures snap targets that constrain cursor input to precise locations. Available snaps include: 'Grid' (snap to grid intersections), 'Vertex' (snap to geometry vertices), 'Endpoint' (snap to curve ends), 'Midpoint' (snap to segment centers), 'Intersection' (snap to where curves cross), and 'Perpendicular' (snap to perpendicular positions). Multiple snaps can be active simultaneously. Snapping is essential for precision—it ensures points align exactly to intended locations rather than approximating.",
    category: "performs",
  },
  grid: {
    description: "Configures the workspace grid that provides spatial reference and snap targets. Settings include: spacing (distance between grid lines), units (measurement system), and adaptive mode (grid density adjusts with zoom). The grid is a visual aid and a snapping target—it establishes the spatial rhythm of your design. Smaller spacing enables finer positioning but creates denser visual patterns. Most projects work with grids matching standard architectural or manufacturing increments.",
    category: "performs",
  },
  cplane: {
    description: "Sets the Construction Plane (C-Plane)—the 2D working surface where geometry is created and positioned. Preset planes include World XY (horizontal floor), World XZ (vertical wall facing you), and World YZ (vertical wall to the side). Custom C-Planes can be defined by clicking three points: origin, X-axis direction, Y-axis direction. The C-Plane determines 'flat' for 2D operations: rectangles, circles, and most drawing commands create geometry parallel to the active C-Plane. Setting the right C-Plane is essential for working on angled surfaces or in local coordinate systems.",
    category: "performs",
  },
  outliner: {
    description: "Opens the outliner panel—a hierarchical list view of all objects in the model for organization and visibility management. The outliner shows: object names, layer assignments, visibility states, and selection status. Click objects in the outliner to select them; toggle visibility icons to show/hide; drag objects to reorganize layers. The outliner is essential for managing complexity—when the viewport is crowded, the outliner provides a structured view. Use it for layer organization, batch visibility changes, and finding specific objects by name.",
    category: "performs",
  },
  tolerance: {
    description: "Sets the geometric tolerance values that control precision for Boolean operations, curve intersections, and surface fitting. Absolute tolerance is the maximum allowed gap between points considered 'touching.' Angle tolerance is the maximum deviation for surfaces considered 'tangent.' Tighter tolerances produce more accurate geometry but may slow operations or cause failures on imprecise input. Default tolerances work for most architectural-scale work; precision manufacturing may require tighter values. Tolerance settings affect subsequent operations, not existing geometry.",
    category: "performs",
  },
  status: {
    description: "Toggles the status bar at the bottom of the viewport that displays contextual information about current state: active command, cursor coordinates, snap indicators, selection count, and system messages. The status bar is the communication channel between Roslyn and you—it tells you what command expects, what snap is active, and provides feedback on operations. Hide the status bar for maximum viewport space during presentation; show it during active modeling for feedback. Status bar elements are clickable for quick access to related settings.",
    category: "performs",
  },
};
