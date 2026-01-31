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
      "Points are invisible in rendered views but serve as construction geometry",
      "Use as construction guides before creating curves",
      "Points can be referenced in Numerica for parametric control",
      "Multiple points can be selected and moved together",
    ],
    examples: [
      "Place reference points for a loft operation",
      "Mark array positions before distributing objects",
      "Create control point grid for surface deformation",
      "Define anchor points for parametric relationships",
    ],
    pitfalls: [
      "Points don't render in output—use small spheres for visible markers",
      "Overlapping points are hard to select—use vertex filter mode",
    ],
    relatedCommands: ["polyline", "curve", "line"],
    workflowNotes: "Point is the atomic geometric primitive in Lingua. It exists as a zero-dimensional location in 3D space, serving as the foundation for all higher-order geometry. In Roslyn's ontology, points are construction elements—they define positions but carry no visual mass. When brought into Numerica via Geometry Reference, points become parametric anchors that can drive transformations, define constraints, or seed algorithmic operations. The point's semantic role is to mark intention: where something begins, where forces apply, where relationships anchor. In the trinity of language-geometry-number, the point is where number (coordinates) becomes geometry (position) and can be described in language (a location, an anchor, a reference).",
  },
  line: {
    tips: [
      "Hold Shift for orthogonal constraint",
      "Type coordinates in command line for precision",
      "Chain segments by continuing to click",
      "Lines are one-dimensional curves connecting two points",
    ],
    examples: [
      "Draw bracket profile then extrude",
      "Create construction grid with intersecting lines",
      "Define structural members in framework",
    ],
    pitfalls: [
      "Lines are individual segments—use Polyline for a connected chain",
    ],
    relatedCommands: ["polyline", "rectangle", "extrude"],
    workflowNotes: "Line represents the simplest one-dimensional geometric element: the straight path between two points. In Roslyn's direct modeling paradigm, lines serve as both construction geometry and profile elements. Ontologically, a line embodies directionality and distance—it has a start, an end, and a vector between them. When referenced in Numerica, lines can drive parametric operations: their length can control dimensions, their direction can define transformation axes, their endpoints can anchor other geometry. Lines are the building blocks of polylines, the edges of surfaces, the paths for sweeps. They represent intention made geometric: the desire to connect, to span, to define an axis.",
  },
  polyline: {
    tips: [
      "Right-click to finish without adding a point",
      "Close by clicking near the start to create a loop",
      "Convert to smooth curve with Interpolate",
      "Each vertex can be edited individually after creation",
    ],
    examples: [
      "Draw floor plan outline to extrude into walls",
      "Trace reference image for profile creation",
      "Create complex profiles for lofting operations",
    ],
    pitfalls: [
      "Sharp corners—use Fillet to round after creation",
      "Self-intersecting polylines may cause issues in surface operations",
    ],
    relatedCommands: ["line", "curve", "interpolate"],
    workflowNotes: "Polyline is a connected sequence of line segments, representing a path through space defined by ordered vertices. Unlike individual lines, a polyline maintains topological continuity—the end of one segment is the start of the next. This continuity makes polylines ideal for profiles, boundaries, and paths. In Lingua's ontology, polylines bridge the discrete (individual points) and the continuous (the path they define). When closed, polylines become boundaries that can enclose surfaces. When open, they become paths for sweeps and extrusions. In Numerica, polylines can be decomposed into vertices for manipulation or treated as unified curves for transformation. The polyline embodies sequence and connection—it is geometry that remembers order.",
  },
  rectangle: {
    tips: [
      "Type width,height for exact dimensions",
      "Hold Shift to constrain to square",
      "First click sets corner, second sets opposite",
      "Always aligned to current C-Plane orientation",
    ],
    examples: [
      "Create floor plate for extrusion",
      "Define boundary for array pattern",
      "Generate window opening profiles",
    ],
    pitfalls: [
      "Axis-aligned to C-Plane—rotate C-Plane for angled rectangles",
    ],
    relatedCommands: ["circle", "surface", "extrude"],
    workflowNotes: "Rectangle is a closed four-vertex polyline with perpendicular sides, representing the archetypal rectilinear boundary. In Roslyn's geometric vocabulary, rectangles are fundamental profile shapes—they define floors, walls, openings, panels. The rectangle's ontological significance lies in its orthogonality: it respects the axes of the C-Plane, embodying alignment and regularity. When used as an extrusion profile, rectangles generate boxes. When used as boundaries, they define planar regions. In Numerica, rectangles can be parametrically controlled via width and height, making them ideal for dimensional studies. The rectangle represents human-scale thinking: rooms are rectangular, buildings are rectangular, screens are rectangular. It is geometry aligned with how we organize space.",
  },
  circle: {
    tips: [
      "Type radius value for exact size",
      "Perfect NURBS with exact curvature—mathematically precise",
      "Use as profile for Extrude or Loft to create cylinders and surfaces of revolution",
      "Center point and radius fully define the circle",
    ],
    examples: [
      "Create wheel profile for vehicle",
      "Define circular opening for Boolean operations",
      "Generate column cross-sections",
      "Create pipe profiles for sweeping",
    ],
    relatedCommands: ["arc", "extrude", "loft"],
    workflowNotes: "Circle is the perfect curve, equidistant from a center point, representing radial symmetry and continuous curvature. In Roslyn, circles are NURBS curves with exact mathematical definition—they are not approximations but true circles. The circle's ontological role is to embody uniformity and rotation: it has no preferred direction, no beginning or end. When extruded, circles become cylinders. When lofted between varying radii, they create surfaces of revolution. In Numerica, the circle's radius becomes a parametric control, allowing exploration of scale while maintaining perfect circularity. The circle represents completeness, cycles, and radial organization—it is the geometry of wheels, pipes, columns, and orbits.",
  },
  arc: {
    tips: [
      "Three-point definition: start, end, bulge point",
      "Join with lines for complex profiles",
      "Curvature set by third point position",
      "Arcs are circular segments, not arbitrary curves",
    ],
    examples: ["Create rounded corners in profile",
      "Design cam or arch shapes",
      "Generate filleted transitions between straight segments",
    ],
    pitfalls: [
      "Points must not be collinear—they must define a unique circle",
    ],
    relatedCommands: ["circle", "curve", "polyline"],
    workflowNotes: "Arc is a portion of a circle, defined by three points that determine a unique circular path. Unlike arbitrary curves, arcs maintain constant curvature—they are fragments of perfect circles. In Roslyn's geometric ontology, arcs bridge the straight and the curved: they provide controlled curvature without the complexity of freeform curves. Arcs are essential for creating smooth transitions, rounded corners, and partial circular features. When combined with lines, arcs form the basis of most technical profiles. In Numerica, arcs can be parametrically controlled by adjusting their defining points or by converting them to full circles with variable trim parameters. The arc represents partial rotation, controlled curvature, and the transition between linear and circular geometry.",
  },
  curve: {
    tips: [
      "Control points influence but don't lie on curve",
      "Higher degree = smoother (3 = cubic)",
      "Use Interpolate if curve must pass through points",
      "NURBS curves provide smooth, continuous curvature",
    ],
    examples: [
      "Design organic profiles for products",
      "Create sweep paths for pipes",
      "Generate smooth transitions between geometric features",
    ],
    relatedCommands: ["polyline", "interpolate", "loft"],
    workflowNotes: "Curve represents freeform NURBS geometry, where control points guide but do not constrain the path. In Roslyn's ontology, curves are the bridge between rigid geometric primitives and organic forms. Control points exert influence through basis functions, creating smooth paths that approximate designer intention without forcing the curve through exact locations. This indirect control allows for elegant, flowing forms. When brought into Numerica, curves can be manipulated by moving control points, adjusting weights, or modifying degree. Curves are essential for lofting, sweeping, and defining organic boundaries. They represent design freedom—the ability to shape space fluidly while maintaining mathematical continuity.",
  },

  // === GEOMETRY: NURBS Primitives ===
  nurbsbox: {
    tips: [
      "Mathematically exact surfaces for CAD",
      "Convert to mesh for rendering or export",
      "NURBS surfaces maintain exact definition at any scale",
    ],
    relatedCommands: ["nurbssphere", "nurbscylinder", "meshconvert"],
    workflowNotes: "NURBS Box creates a box using NURBS surfaces rather than triangle meshes. NURBS (Non-Uniform Rational B-Splines) are mathematical surface definitions that remain exact at any scale. In Roslyn's representation ontology, NURBS primitives represent mathematical idealization: surfaces defined by equations rather than discrete triangles. NURBS boxes are essential for CAD workflows where exact surface definitions are required. They can be trimmed, filleted, and Boolean-ed with other NURBS surfaces. Ontologically, NURBS Box embodies the distinction between continuous mathematical representation and discrete mesh representation. It is geometry as equation rather than geometry as triangles.",
  },
  nurbssphere: {
    tips: [
      "Exact spherical surface definition",
      "Trimmable for partial spheres",
      "Maintains perfect curvature at all scales",
    ],
    relatedCommands: ["nurbsbox", "nurbscylinder"],
    workflowNotes: "NURBS Sphere creates a perfect sphere using NURBS surface patches. Unlike mesh spheres (which approximate spherical form with triangles), NURBS spheres are mathematically exact: every point on the surface is equidistant from the center. In Roslyn's geometric ontology, NURBS Sphere represents perfect form: the ideal sphere that exists in mathematical space. NURBS spheres can be trimmed to create partial spheres, filleted with other surfaces, and maintain exact curvature under scaling. Ontologically, NURBS Sphere embodies mathematical perfection: the sphere as equation rather than approximation. It is the Platonic ideal of spherical form.",
  },
  nurbscylinder: {
    tips: [
      "Exact circular cross-section",
      "Cap or leave open for pipe geometry",
      "Maintains perfect cylindrical form at any scale",
    ],
    relatedCommands: ["nurbsbox", "nurbssphere"],
    workflowNotes: "NURBS Cylinder creates a cylinder with exact circular cross-section using NURBS surfaces. The circular profile is mathematically perfect, and the surface is a ruled surface generated by sweeping the circle along an axis. In Roslyn's geometric ontology, NURBS Cylinder represents axial symmetry and linear extrusion in exact form. NURBS cylinders can be capped (creating closed solids) or left open (creating pipe surfaces). They maintain exact circularity under transformation. Ontologically, NURBS Cylinder embodies the combination of circular and linear: perfect radial symmetry combined with linear translation. It is the geometry of pipes, columns, and axially symmetric forms.",
  },

  // === GEOMETRY: Mesh Operations ===
  interpolate: {
    tips: [
      "Creates curve passing through all vertices",
      "Works on polylines",
      "Generates smooth NURBS curve from discrete points",
    ],
    examples: [
      "Smooth traced outline into NURBS curve",
      "Convert sketched polyline into flowing curve",
      "Create smooth paths from point sequences",
    ],
    relatedCommands: ["curve", "polyline", "loft"],
    workflowNotes: "Interpolate converts a polyline into a smooth NURBS curve that passes through all vertices. Unlike regular NURBS curves (where control points influence but don't lie on the curve), interpolated curves are constrained to pass through specified points. In Roslyn's geometric ontology, interpolate represents the transformation from discrete to continuous: a sequence of points becomes a smooth path. Interpolation finds the smoothest curve that satisfies the point constraints. Ontologically, interpolate embodies the transition from sketched to refined: rough polylines become smooth curves. It is how hand-drawn paths become mathematically smooth geometry.",
  },
  surface: {
    tips: [
      "Input must be closed and planar",
      "Creates planar fill surface from boundary curve",
      "Surface fills the interior of closed curves",
    ],
    examples: [
      "Cap extrusion with surface",
      "Create floor from closed outline",
      "Fill window opening for solid modeling",
    ],
    relatedCommands: ["extrude", "loft", "boolean"],
    workflowNotes: "Surface transforms a one-dimensional boundary into a two-dimensional region. In Roslyn's ontology, surfaces are the transition from curve to solid—they enclose area and define faces. A planar surface fills a closed curve with a flat face, creating the foundation for solid modeling. When multiple surfaces bound a volume, they can be joined into solids for Boolean operations. In Numerica, surfaces can be analyzed for area, subdivided for mesh operations, or used as input for thickening and offsetting. The surface represents enclosure and boundary—it is where inside meets outside, where two-dimensional thinking manifests in three-dimensional space.",
  },
  loft: {
    tips: [
      "Select profiles in order—sequence determines surface flow",
      "Similar point counts give best results",
      "Creates smooth transition between shapes",
      "Profiles should have consistent orientation to avoid twisting",
    ],
    examples: [
      "Create vase by lofting circles of varying radii",
      "Design boat hull from cross-sections",
      "Generate aerodynamic forms from airfoil profiles",
      "Build architectural massing from floor plan variations",
    ],
    pitfalls: [
      "Mismatched curve directions create twisted lofts",
      "Drastically different profile shapes may create self-intersecting surfaces",
    ],
    relatedCommands: ["extrude", "surface", "curve"],
    workflowNotes: "Loft is the operation of creating a surface that smoothly transitions between multiple profile curves. In Roslyn's geometric ontology, lofting represents interpolation in three dimensions—it finds the smooth path between shapes, creating continuous surfaces from discrete cross-sections. Lofting embodies transformation and morphing: how one form becomes another. The operation requires understanding of curve orientation, point correspondence, and surface continuity. In Numerica, loft profiles can be parametrically varied to explore form families. Loft represents the designer's ability to define key moments (the profiles) and let the system interpolate between them—it is geometry that flows, transforms, and transitions.",
  },
  extrude: {
    tips: [
      "Default direction is C-Plane normal",
      "Cap option closes ends for solid",
      "Negative distance extrudes opposite direction",
      "Extrusion creates ruled surfaces from profiles",
    ],
    examples: [
      "Turn floor plan into 3D walls",
      "Create text from letter outlines",
      "Generate structural members from cross-sections",
      "Build massing from footprint",
    ],
    relatedCommands: ["surface", "loft", "boolean"],
    workflowNotes: "Extrude is the fundamental operation of adding dimension—it takes a two-dimensional profile and sweeps it through space to create three-dimensional form. In Roslyn's ontology, extrusion represents linear translation: a shape maintains its identity while moving through space, leaving a surface in its wake. Extrusion is how architects think: a floor plan extruded becomes a building, a profile extruded becomes a beam. When capped, extrusions create closed solids suitable for Boolean operations. In Numerica, extrusion distance becomes a parametric control, allowing exploration of height, depth, and proportion. Extrude represents the transformation from plan to volume, from outline to mass—it is the operation that gives thickness to ideas.",
  },
  boolean: {
    tips: [
      "Both objects must be closed solids",
      "Union combines, Difference subtracts, Intersection keeps overlap",
      "Boolean operations use computational geometry algorithms for solid modeling",
    ],
    examples: [
      "Create hole by subtracting cylinder from box",
      "Combine primitives into complex solid",
      "Subtract void spaces from building mass",
      "Intersect forms to find common volume",
    ],
    pitfalls: [
      "Coplanar faces can cause failures—offset slightly",
      "Non-manifold geometry may produce unexpected results",
    ],
    relatedCommands: ["extrude", "meshmerge"],
    workflowNotes: "Boolean operations are the fundamental set-theoretic operations on solid geometry: Union (A ∪ B), Difference (A - B), and Intersection (A ∩ B). In Roslyn's ontology, Booleans represent logical operations made geometric—they treat solids as sets of points and compute their relationships. Union combines volumes, Difference carves away material, Intersection finds common space. Booleans are how complex forms emerge from simple primitives: a building is boxes unioned together with cylinders subtracted for openings. In Numerica, Boolean operations can be parametrically controlled by varying the input geometries. Booleans represent additive and subtractive thinking—the logic of combination and removal made spatial.",
  },
  meshconvert: {
    tips: [
      "Tessellates NURBS into triangles",
      "Required for STL export or mesh editing",
      "Converts continuous mathematical surfaces into discrete triangle meshes",
    ],
    relatedCommands: ["breptomesh", "nurbsrestore"],
    workflowNotes: "Mesh Convert transforms continuous NURBS geometry into discrete triangle meshes through tessellation. This operation represents the transition from mathematical idealization to computational representation. NURBS surfaces are infinitely smooth and resolution-independent, but many operations (Boolean, subdivision, export) require triangle meshes. Tessellation samples the NURBS surface at intervals, creating a faceted approximation. The ontological shift is from continuous to discrete, from exact to approximate, from mathematical to computational. In Numerica, mesh conversion enables access to mesh-specific operations while sacrificing the editability of NURBS. It represents the practical compromise between mathematical purity and computational tractability.",
  },
  breptomesh: {
    tips: [
      "Converts B-Rep solids to mesh",
      "Control density with tolerance settings",
      "B-Rep topology is converted to mesh connectivity",
    ],
    relatedCommands: ["meshconvert", "meshtobrep"],
    workflowNotes: "B-Rep to Mesh converts boundary representation solids into triangle meshes. B-Rep (Boundary Representation) stores geometry as faces, edges, and vertices with topological relationships. Mesh representation stores geometry as triangle soup with vertex positions and face indices. This conversion enables mesh operations (subdivision, relaxation, export) on solid models. The ontological transformation is from topological to geometric representation, from relationships to positions. B-Rep preserves exact surface definitions; mesh approximates them with triangles. In Numerica, this conversion is often necessary before applying mesh-specific algorithms or exporting to fabrication formats.",
  },
  meshtobrep: {
    tips: [
      "Each triangle becomes a B-Rep face",
      "Enables Boolean on imported meshes",
      "Reconstructs topological relationships from mesh connectivity",
    ],
    relatedCommands: ["breptomesh", "boolean"],
    workflowNotes: "Mesh to B-Rep converts triangle meshes into boundary representation solids, enabling Boolean operations on imported or generated meshes. This operation reconstructs topological relationships (which edges are shared, which faces are adjacent) from geometric data (vertex positions, triangle indices). The conversion is essential for applying solid modeling operations to mesh geometry. Ontologically, this represents the reverse of B-Rep to Mesh: from discrete geometric representation back to topological solid representation. It enables treating meshes as solids, opening access to Boolean operations and solid modeling workflows.",
  },
  nurbsrestore: {
    tips: [
      "Works best on recently converted meshes",
      "May fail if NURBS metadata lost",
      "Attempts to recover original NURBS definition from tessellated mesh",
    ],
    relatedCommands: ["meshconvert"],
    workflowNotes: "NURBS Restore attempts to recover the original NURBS surface from a mesh that was previously converted from NURBS. When Mesh Convert tessellates NURBS, Lingua stores metadata linking the mesh back to its NURBS source. NURBS Restore uses this metadata to reconstruct the continuous surface from the discrete mesh. This operation represents reversibility in geometric conversion—the ability to move between representations without permanent loss. Ontologically, it embodies the preservation of mathematical truth beneath computational approximation. The operation succeeds when metadata is intact, enabling round-trip workflows between NURBS and mesh representations.",
  },
  meshmerge: {
    tips: [
      "Combines multiple meshes into single mesh without welding vertices",
      "For geometric union use Boolean",
      "Preserves individual mesh identities within combined result",
    ],
    relatedCommands: ["boolean", "meshflip"],
    workflowNotes: "Mesh Merge combines multiple mesh objects into a single mesh container without modifying geometry. Unlike Boolean Union, which computes geometric intersection and creates a unified solid, Mesh Merge simply concatenates vertex and face lists. The operation is topologically neutral—meshes retain their individual identities within the merged result. This is useful for grouping objects for export, applying unified transformations, or organizing geometry hierarchically. Ontologically, Mesh Merge represents aggregation without integration: objects coexist in the same container but maintain their boundaries. It is the difference between a collection and a fusion.",
  },
  meshflip: {
    tips: [
      "Reverses normals and winding order",
      "Fixes inside-out faces from import",
      "Changes which side of the surface is considered 'front'",
    ],
    relatedCommands: ["meshmerge", "meshthicken"],
    workflowNotes: "Mesh Flip reverses the orientation of mesh faces by flipping normal vectors and reversing triangle winding order. In 3D graphics, surfaces have a front and back determined by normal direction. Flipping changes which side is visible and how lighting interacts with the surface. This operation is essential when imported meshes have inverted normals (appearing inside-out). Ontologically, Mesh Flip represents the duality of surfaces: every face has two sides, and which side is 'correct' depends on context. The operation embodies orientation and sidedness—fundamental properties of two-dimensional surfaces embedded in three-dimensional space.",
  },
  meshthicken: {
    tips: [
      "Creates shell by offsetting along normals",
      "Set thickness and cap options",
      "Generates solid volume from surface mesh",
    ],
    examples: [
      "Add wall thickness to thin surface",
      "Create shell structures from surface models",
      "Generate fabrication-ready geometry with material thickness",
    ],
    relatedCommands: ["meshflip", "extrude"],
    workflowNotes: "Mesh Thicken transforms a surface mesh into a solid shell by offsetting vertices along their normals and creating connecting geometry. This operation gives thickness to infinitely thin surfaces, converting them into volumetric objects with inner and outer faces. The thickness parameter controls the offset distance, while cap options determine whether edges are closed. Ontologically, Mesh Thicken represents materialization: the transformation from idealized surface to physical shell. It embodies the transition from geometric abstraction to fabrication reality, where every object must have thickness. In architectural and product design, thickening is how surface studies become buildable forms.",
  },

  // === TRANSFORM ===
  transform: {
    tips: [
      "Access move, rotate, scale via gumball",
      "Type values for precision",
      "Unified interface for all transformation operations",
    ],
    relatedCommands: ["move", "rotate", "scale", "gumball"],
    workflowNotes: "Transform is the unified command for modifying geometry position, orientation, and scale. It provides access to the three fundamental affine transformations: translation (move), rotation, and scaling. In Roslyn's ontology, transformations are operations that preserve geometric properties while changing spatial relationships. Transformations are reversible, composable, and can be parametrically controlled. The transform command embodies the separation between geometry (shape) and placement (position/orientation/scale). In Numerica, transformations become parametric operations that can be driven by sliders, expressions, or solver outputs. Transform represents the malleability of geometry—the ability to reposition, reorient, and resize without destroying form.",
  },
  move: {
    tips: [
      "Drag axis arrows for constrained movement",
      "Type XYZ for precise displacement",
      "Translation preserves shape and orientation",
    ],
    examples: [
      "Align objects by moving with snap",
      "Stack objects by moving in Z",
      "Position elements relative to reference geometry",
    ],
    relatedCommands: ["rotate", "scale", "gumball"],
    workflowNotes: "Move is pure translation: displacement in space without rotation or scaling. In Roslyn's geometric ontology, moving changes position while preserving all intrinsic properties—shape, size, orientation remain constant. Move is defined by a vector: direction and distance. The operation is fundamental to assembly, alignment, and spatial organization. In Numerica, move operations can be parametrically controlled via displacement vectors, enabling animated motion, positional arrays, and constraint-based placement. Move represents location as a variable—the recognition that geometry can exist anywhere in space while maintaining its identity.",
  },
  rotate: {
    tips: [
      "Rotation uses current pivot point",
      "Shift for 15° snap increments",
      "Positive angle = counter-clockwise (right-hand rule)",
      "Rotation preserves shape and size",
    ],
    relatedCommands: ["move", "scale", "pivot"],
    workflowNotes: "Rotate changes orientation around an axis through a pivot point. In Roslyn's ontology, rotation is angular transformation: geometry spins while maintaining its shape and size. Rotation is defined by an axis (direction), angle (amount), and pivot (center). The operation embodies circular motion and angular relationships. In Numerica, rotation angles can be parametrically controlled, enabling exploration of orientation, creation of radial patterns, and simulation of rotational motion. Rotate represents orientation as a variable—the recognition that geometry can face any direction while preserving its form. It is the transformation of turning, spinning, and angular positioning.",
  },
  scale: {
    tips: [
      "Factor 2 doubles, 0.5 halves",
      "Shift for uniform scaling",
      "Scales from pivot point",
      "Non-uniform scaling can stretch or compress along axes",
    ],
    relatedCommands: ["move", "rotate", "pivot"],
    workflowNotes: "Scale changes size while preserving shape (when uniform) or proportions (when non-uniform). In Roslyn's ontology, scaling is multiplicative transformation: distances from the pivot are multiplied by scale factors. Uniform scaling (same factor in all directions) preserves angles and proportions. Non-uniform scaling stretches or compresses along specific axes, enabling dimensional variation. In Numerica, scale factors can be parametrically controlled, enabling size studies, proportional exploration, and dimensional optimization. Scale represents size as a variable—the recognition that geometry can exist at any scale while maintaining its essential form. It is the transformation of growth, shrinkage, and dimensional variation.",
  },
  offset: {
    tips: [
      "Positive = outward, negative = inward",
      "Self-intersections handled automatically",
      "Creates parallel curves at specified distance",
    ],
    examples: [
      "Create wall thickness from centerline",
      "Generate offset boundaries for clearances",
      "Create concentric patterns from single curve",
    ],
    relatedCommands: ["mirror", "extrude"],
    workflowNotes: "Offset creates a parallel curve at a specified perpendicular distance from the original. In Roslyn's geometric ontology, offsetting represents normal displacement: moving along the perpendicular direction while maintaining curve topology. Offset handles complex cases: sharp corners are filleted or mitered, self-intersections are resolved. The operation is essential for creating wall thicknesses, clearances, and concentric patterns. In Numerica, offset distance can be parametrically varied to explore spacing relationships. Offset represents parallel thinking—the creation of related forms that maintain constant separation while following the same path.",
  },
  mirror: {
    tips: [
      "Click two points to define mirror axis or plane",
      "Original can be kept or deleted",
      "Creates perfect bilateral symmetry",
    ],
    examples: [
      "Model half, then mirror for symmetric design",
      "Create symmetric architectural elements",
      "Generate mirrored mechanical parts",
    ],
    relatedCommands: ["duplicate", "array"],
    workflowNotes: "Mirror creates a reflected copy across a plane or axis, producing perfect bilateral symmetry. In Roslyn's ontology, mirroring is reflective transformation: geometry is flipped across a plane while preserving distances and angles. Mirroring exploits symmetry to reduce modeling effort—design half, mirror to complete. The operation embodies duality and reflection: left becomes right, front becomes back. In Numerica, mirror planes can be parametrically positioned, enabling exploration of symmetric variations. Mirror represents symmetry as a design principle—the recognition that many natural and designed forms exhibit bilateral or radial symmetry.",
  },
  array: {
    tips: [
      "Set direction, spacing, and count",
      "Copies are independent objects",
      "Linear and polar array modes available",
    ],
    examples: [
      "Create colonnade of columns",
      "Build staircase by arraying step",
      "Generate facade panel repetitions",
      "Create radial patterns around center",
    ],
    relatedCommands: ["duplicate", "mirror"],
    workflowNotes: "Array creates multiple copies of geometry distributed according to a pattern: linear (along a direction) or polar (around a center). In Roslyn's ontology, arrays represent repetition and pattern—the multiplication of a unit element to create rhythmic compositions. Arrays embody the relationship between the one and the many: a single element defines the pattern, repetition creates the whole. In Numerica, array parameters (count, spacing, angle) can be parametrically controlled, enabling exploration of density, rhythm, and distribution. Array represents pattern thinking—the recognition that complex compositions often emerge from repeated simple elements.",
  },
  gumball: {
    tips: [
      "Drag arrows to move, rings to rotate, handles to scale",
      "Click center to switch modes",
      "Visual manipulation widget for direct transformation control",
    ],
    relatedCommands: ["move", "rotate", "scale"],
    workflowNotes: "Gumball is the interactive transformation widget that provides direct manipulation of geometry through visual handles. In Roslyn's interface ontology, the gumball embodies immediate feedback: drag an arrow and see movement, drag a ring and see rotation, drag a handle and see scaling. The gumball makes abstract transformations tangible by mapping mouse movement to geometric change. It represents the principle of direct manipulation—the user acts on visual representations of transformation axes rather than typing numerical values. The gumball is where intention (I want to move this) meets action (drag here) with immediate visual confirmation.",
  },
  morph: {
    tips: [
      "Brush-based sculpting on mesh geometry",
      "Adjust brush size and strength for control",
      "Enables organic deformation of mesh surfaces",
    ],
    relatedCommands: ["move", "scale"],
    workflowNotes: "Morph enables brush-based sculpting, allowing organic deformation of mesh geometry through direct manipulation. Unlike parametric transformations (move, rotate, scale), morphing is freeform: the user paints changes onto the surface. In Roslyn's ontology, morphing represents artistic intervention—the ability to shape geometry intuitively without mathematical constraints. Morph operations are local (affecting only the brush area) and cumulative (multiple strokes build up changes). This represents a different mode of geometric thinking: sculptural rather than constructive, intuitive rather than parametric. Morph bridges the gap between precise CAD modeling and organic artistic shaping.",
  },

  // === EDIT ===
  undo: {
    tips: [
      "Multiple undos step through history",
      "Some operations cannot be undone",
      "History stack preserves modeling sequence",
    ],
    relatedCommands: ["redo"],
    workflowNotes: "Undo reverses the most recent modeling operation, stepping backward through the history stack. In Roslyn's temporal ontology, undo represents reversibility: the ability to explore design directions and backtrack when needed. The history stack is a linear sequence of snapshots, each capturing the complete modeling state. Undo enables experimental workflows: try something, evaluate it, undo if unsatisfactory. Ontologically, undo embodies the non-linearity of creative process: design is not a straight path but a branching exploration with dead ends and revisions. Undo makes failure safe, encouraging experimentation and iteration.",
  },
  redo: {
    tips: [
      "Only available after undo",
      "New changes clear redo stack",
      "Moves forward through previously undone operations",
    ],
    relatedCommands: ["undo"],
    workflowNotes: "Redo moves forward through the history stack, restoring operations that were previously undone. The redo stack exists only after undo operations and is cleared when new changes are made. In Roslyn's temporal ontology, redo represents the ability to reconsider: you can undo to explore alternatives, then redo to return to the original path. The undo/redo system creates a timeline with a movable present: you can step backward and forward through modeling history. Ontologically, redo embodies temporal navigation: the ability to move through time in both directions, treating the past as revisitable rather than fixed.",
  },
  copy: {
    tips: [
      "Copies to system clipboard",
      "Can paste in other documents or applications",
      "Preserves geometry data for cross-document transfer",
    ],
    relatedCommands: ["paste", "duplicate"],
    workflowNotes: "Copy serializes selected geometry to the system clipboard, enabling transfer between documents or applications. In Roslyn's data ontology, copy represents externalization: geometry is converted from internal representation to portable format. The clipboard acts as a temporary external memory, allowing geometry to transcend document boundaries. Copy enables reuse, sharing, and cross-pollination between projects. Ontologically, copy embodies duplication and portability: the ability to replicate geometry and move it between contexts. It represents the separation of geometry from its original context, making it available for new uses.",
  },
  paste: {
    tips: [
      "Choose placement: in place, cursor, or origin",
      "Deserializes clipboard geometry into current document",
      "Creates new geometry instances with unique IDs",
    ],
    relatedCommands: ["copy", "duplicate"],
    workflowNotes: "Paste deserializes geometry from the clipboard and instantiates it in the current document. The operation offers placement options: in place (original position), at cursor (user-specified location), or at origin (world zero). In Roslyn's data ontology, paste represents internalization: external geometry data is converted back to internal representation with new IDs. Paste completes the copy operation, enabling geometry to be replicated across documents. Ontologically, paste embodies instantiation: abstract clipboard data becomes concrete geometry in the modeling space. It represents the materialization of copied forms in new contexts.",
  },
  duplicate: {
    tips: [
      "Creates copy at same location",
      "Faster than copy-paste for in-document duplication",
      "Generates new geometry with unique ID",
    ],
    relatedCommands: ["copy", "array"],
    workflowNotes: "Duplicate creates an identical copy of selected geometry at the same location. Unlike copy-paste, duplicate is a single operation that doesn't use the clipboard. The duplicated geometry has a new ID but identical properties. In Roslyn's ontology, duplicate represents in-place replication: the creation of identical twins that occupy the same space. This is useful as a starting point for variations: duplicate, then modify. Ontologically, duplicate embodies the concept of the copy: two objects with identical form but separate identity. It represents the ability to replicate without displacement, creating the foundation for variation.",
  },
  delete: {
    tips: [
      "Removes selected geometry from the model",
      "Recoverable with Undo",
      "Deletion is recorded in history for reversibility",
    ],
    relatedCommands: ["undo"],
    workflowNotes: "Delete removes selected geometry from the model, eliminating it from the scene and all internal data structures. In Roslyn's ontology, deletion represents subtraction from existence: geometry ceases to be part of the model. The operation is recorded in history, making it reversible via undo. Delete is essential for refinement: removing unsuccessful attempts, cleaning up construction geometry, eliminating unnecessary elements. Ontologically, delete embodies removal and negation: the ability to unmake, to subtract, to eliminate. It represents the destructive aspect of creation—the recognition that making often requires unmaking.",
  },
  cancel: {
    tips: [
      "Aborts current operation without committing changes",
      "Preview geometry removed",
      "Returns to previous state as if command was never started",
    ],
    relatedCommands: ["confirm"],
    workflowNotes: "Cancel aborts the current command without committing changes, discarding any preview geometry and returning to the pre-command state. In Roslyn's interaction ontology, cancel represents the ability to explore without commitment: you can start an operation, see its preview, and decide not to proceed. Cancel makes exploration safe by ensuring that starting a command doesn't force you to complete it. Ontologically, cancel embodies tentative action: the ability to try without committing, to preview without finalizing. It represents the separation between intention and action, between exploration and commitment.",
  },
  confirm: {
    tips: [
      "Commits current operation to the model",
      "Enter key also confirms",
      "Finalizes preview geometry into permanent geometry",
    ],
    relatedCommands: ["cancel"],
    workflowNotes: "Confirm commits the current operation, converting preview geometry into permanent geometry and recording the change in history. In Roslyn's interaction ontology, confirm represents the transition from tentative to final: preview becomes reality, exploration becomes commitment. The operation marks the completion of a command cycle: initiate, preview, confirm. Ontologically, confirm embodies finalization: the transformation from potential to actual, from temporary to permanent. It represents the moment of decision: this is what I want, make it so. Confirm is the punctuation mark that ends a modeling sentence.",
  },

  // === VIEW ===
  focus: {
    tips: [
      "Frames selection with margin",
      "If nothing selected, frames all",
      "Automatically adjusts camera to show selected geometry",
    ],
    relatedCommands: ["frameall", "zoom"],
    workflowNotes: "Focus adjusts the camera to frame selected geometry with appropriate margin. In Roslyn's viewport ontology, focus represents attention made spatial: the camera moves to center on what matters. Focus enables rapid navigation: select an object, press focus, and the view adjusts to show it clearly. The operation embodies the principle of context-sensitive viewing: what you select determines what you see. Ontologically, focus represents the alignment of visual attention with selection: the camera follows your interest, making the selected geometry the center of visual attention.",
  },
  frameall: {
    tips: [
      "Shows entire scene in viewport",
      "Ignores hidden objects",
      "Calculates bounding box of all visible geometry",
    ],
    relatedCommands: ["focus", "zoom"],
    workflowNotes: "Frame All adjusts the camera to show all visible geometry in the scene. In Roslyn's viewport ontology, Frame All represents the overview perspective: stepping back to see the whole rather than focusing on parts. The operation computes the bounding box of all visible geometry and positions the camera to encompass it. Frame All is essential for orientation: after detailed work, frame all to regain context. Ontologically, it embodies the whole-part relationship: the ability to zoom out and see how individual elements compose into the complete scene.",
  },
  screenshot: {
    tips: [
      "Captures current viewport as image",
      "Opens export preview with resolution and format options",
      "Preserves current display mode and camera angle",
    ],
    relatedCommands: ["display"],
    workflowNotes: "Screenshot captures the current Roslyn viewport as a raster image, converting 3D geometry into 2D pixels. In Roslyn's representation ontology, screenshot represents dimensional reduction: three-dimensional space is projected onto a two-dimensional image plane. The operation preserves the current view state: camera position, display mode, lighting. Screenshots enable documentation, presentation, and sharing of design work. Ontologically, screenshot embodies the transformation from interactive 3D model to static 2D image—from explorable geometry to fixed representation. It is how 3D work enters 2D communication channels.",
  },
  view: {
    tips: [
      "Orthographic views: Top, Front, Right",
      "Perspective shows depth and spatial relationships",
      "Standard views align with world axes",
    ],
    relatedCommands: ["camera", "display"],
    workflowNotes: "View switches between standard orthographic projections (Top, Front, Right) and perspective projection. In Roslyn's viewport ontology, view modes represent different ways of seeing: orthographic views preserve parallel lines and true dimensions, while perspective shows depth and spatial relationships as the eye sees them. Standard views align with world axes, providing canonical orientations for technical work. Ontologically, view modes embody the duality between measured truth (orthographic) and perceptual truth (perspective). Different views reveal different aspects of geometry: what is clear in plan may be obscure in elevation.",
  },
  camera: {
    tips: [
      "Zoom to cursor centers zoom on mouse position",
      "Invert zoom reverses scroll direction",
      "Camera settings affect navigation behavior",
    ],
    relatedCommands: ["view", "orbit", "pan"],
    workflowNotes: "Camera controls viewport navigation settings: zoom behavior, orbit sensitivity, and projection parameters. In Roslyn's viewport ontology, the camera is the virtual eye through which geometry is observed. Camera settings customize how navigation feels: zoom to cursor makes the mouse position the zoom center, invert zoom reverses scroll direction. The camera embodies the observer's position and orientation in 3D space. Ontologically, camera settings represent the personalization of viewing: different users prefer different navigation behaviors. The camera is the interface between human perception and geometric space.",
  },
  pivot: {
    tips: [
      "Affects rotation and scale center point",
      "Modes: Object Center, World Origin, or Custom location",
      "Pivot determines the fixed point for transformations",
    ],
    relatedCommands: ["rotate", "scale"],
    workflowNotes: "Pivot sets the center point for rotation and scaling operations. In Roslyn's transformation ontology, the pivot is the fixed point: geometry rotates around it, scales from it. Different pivot modes serve different purposes: Object Center for natural rotation, World Origin for global transformations, Custom for specific control. The pivot embodies the concept of the center: the point that remains fixed while everything else moves. Ontologically, pivot represents the reference point for transformation—the anchor that defines how change propagates through space. Choosing the right pivot is essential for achieving intended transformations.",
  },
  orbit: {
    tips: [
      "Right-click drag to orbit camera around scene",
      "Rotates around target point",
      "Maintains camera distance while changing angle",
    ],
    relatedCommands: ["pan", "zoom"],
    workflowNotes: "Orbit rotates the camera around a target point, changing viewing angle while maintaining distance. In Roslyn's navigation ontology, orbit represents circular inspection: moving around geometry to see it from different angles. The operation keeps the target centered while the camera circles. Orbit is fundamental to 3D understanding: seeing an object from multiple angles reveals its three-dimensional form. Ontologically, orbit embodies the spherical nature of viewpoint: you can look at geometry from any direction on a sphere surrounding it. Orbit is how we explore spatial relationships and understand form in depth.",
  },
  pan: {
    tips: [
      "Middle-click drag to pan camera",
      "Shift+right-click also works",
      "Moves camera parallel to view plane",
    ],
    relatedCommands: ["orbit", "zoom"],
    workflowNotes: "Pan translates the camera parallel to the view plane, shifting what is visible without changing viewing angle or distance. In Roslyn's navigation ontology, pan represents lateral movement: sliding the view to see different parts of the scene. Pan maintains the camera's orientation and distance while changing position. The operation is essential for navigating large scenes: pan to different areas without changing perspective. Ontologically, pan embodies planar translation: movement within the view plane rather than toward or around geometry. It represents the ability to shift visual attention laterally across the scene.",
  },
  zoom: {
    tips: [
      "Scroll wheel zooms in and out",
      "Zoom to cursor centers zoom on mouse position",
      "Changes camera distance from target",
    ],
    relatedCommands: ["orbit", "pan", "focus"],
    workflowNotes: "Zoom changes the camera's distance from the target point, making geometry appear larger (zoom in) or smaller (zoom out). In Roslyn's navigation ontology, zoom represents scale of observation: moving closer to see detail, moving farther to see context. Zoom to cursor makes the mouse position the zoom center, enabling precise navigation to specific features. Ontologically, zoom embodies the relationship between observer and observed: distance determines what is visible and at what resolution. Zoom is how we navigate between overview and detail, between context and specifics.",
  },
  display: {
    tips: [
      "Wireframe shows edges only",
      "Ghosted makes objects transparent",
      "Display modes: Shaded, Wireframe, Shaded+Edges, Ghosted, Silhouette",
    ],
    relatedCommands: ["view", "isolate"],
    workflowNotes: "Display controls how geometry is rendered in the viewport: shaded (surfaces with lighting), wireframe (edges only), shaded with edges, ghosted (transparent), or silhouette (outline only). In Roslyn's visualization ontology, display modes represent different ways of revealing geometry: shaded shows form and volume, wireframe shows structure and topology, ghosted shows context without occlusion. Different modes serve different purposes: wireframe for understanding structure, shaded for evaluating form, ghosted for seeing through objects. Ontologically, display modes embody the multiplicity of representation: the same geometry can be shown in different ways to reveal different aspects.",
  },
  isolate: {
    tips: [
      "Hide everything except selection",
      "Click again to show all",
      "Enables focused work on specific elements",
    ],
    relatedCommands: ["display"],
    workflowNotes: "Isolate hides all geometry except the current selection, enabling focused work without visual clutter. In Roslyn's visibility ontology, isolate represents selective attention: temporarily removing distractions to concentrate on specific elements. The operation is reversible: isolate again to restore full visibility. Isolation is essential for complex scenes: hide everything else to work on details without interference. Ontologically, isolate embodies the figure-ground relationship: making the selected geometry the figure by removing the ground. It represents the ability to create temporary visual context that supports focused work.",
  },

  // === UTILITY ===
  selectionfilter: {
    tips: [
      "Object, Vertex, Edge, or Face mode",
      "Filter shown in status bar",
      "Determines what type of geometry elements can be selected",
    ],
    relatedCommands: ["cycle", "snapping"],
    workflowNotes: "Selection Filter determines what type of geometric elements can be selected: whole objects, individual vertices, edges, or faces. In Roslyn's interaction ontology, selection filters represent hierarchical access to geometry: objects are the highest level, vertices/edges/faces are sub-object components. Different filters enable different operations: object mode for transformations, vertex mode for point editing, edge mode for filleting, face mode for extrusion. Ontologically, selection filters embody the part-whole hierarchy: geometry exists at multiple levels of granularity, and filters determine which level is accessible. The filter represents the scale of interaction: what counts as a selectable unit.",
  },
  cycle: {
    tips: [
      "Tab key also cycles through overlapping selections",
      "Use when objects overlap in viewport",
      "Cycles through all selectable elements under cursor",
    ],
    relatedCommands: ["selectionfilter"],
    workflowNotes: "Cycle iterates through overlapping selectable elements under the cursor, enabling selection of occluded or overlapping geometry. In Roslyn's selection ontology, cycle represents disambiguation: when multiple elements occupy the same screen space, cycle allows choosing between them. The operation is essential for dense scenes where geometry overlaps. Cycling embodies the z-order problem in 3D: multiple objects project to the same 2D screen location, and cycle provides sequential access to all of them. Ontologically, cycle represents the resolution of ambiguity: transforming a many-to-one projection into sequential one-to-one selections.",
  },
  snapping: {
    tips: [
      "Snap modes: Grid, Vertex, Endpoint, Midpoint, Intersection",
      "Multiple snaps can be active simultaneously",
      "Snapping enables precise point placement",
    ],
    relatedCommands: ["grid", "cplane"],
    workflowNotes: "Snapping constrains cursor position to significant geometric features: grid points, existing vertices, curve endpoints, edge midpoints, or curve intersections. In Roslyn's precision ontology, snapping represents magnetic alignment: the cursor is pulled toward geometrically significant locations. Snapping enables precision without numerical input: place points exactly on grid, align with existing geometry, find intersections visually. Different snap modes serve different purposes: grid for regular spacing, vertex for alignment, intersection for finding relationships. Ontologically, snapping embodies the discretization of continuous space: transforming infinite possible positions into a finite set of significant locations.",
  },
  grid: {
    tips: [
      "Set spacing and units",
      "Adaptive grid scales with zoom level",
      "Grid provides visual reference for scale and alignment",
    ],
    relatedCommands: ["snapping", "cplane"],
    workflowNotes: "Grid displays a regular array of lines on the C-Plane, providing visual reference for scale, alignment, and spacing. In Roslyn's spatial ontology, the grid represents the discretization of continuous space: it imposes regular intervals on infinite planes. Adaptive grids adjust spacing based on zoom level, maintaining visual clarity at all scales. The grid serves multiple purposes: visual reference for scale, snap targets for precision, alignment guide for organization. Ontologically, the grid embodies the measurement of space: it makes distance visible and provides a coordinate framework for positioning. The grid is where abstract space becomes measured, organized, and navigable.",
  },
  cplane: {
    tips: [
      "World XY, XZ, YZ presets for standard orientations",
      "Or click 3 points to define custom plane",
      "C-Plane defines the working plane for 2D operations",
    ],
    relatedCommands: ["grid", "snapping"],
    workflowNotes: "C-Plane (Construction Plane) defines the working plane for 2D drawing operations. In Roslyn's spatial ontology, the C-Plane represents the local 2D coordinate system within 3D space: it has an origin, X and Y axes, and a normal direction. Most 2D commands (rectangle, circle, polyline) create geometry on the C-Plane. The C-Plane can be aligned with world axes (XY, XZ, YZ) or custom-defined by three points. Ontologically, the C-Plane embodies the reduction of 3D to 2D: it provides a flat working surface within three-dimensional space. The C-Plane is where 2D thinking (plans, profiles, sketches) occurs within 3D modeling.",
  },
  outliner: {
    tips: [
      "Manage hierarchy and visibility",
      "Rename objects for organization",
      "Provides tree view of scene structure",
    ],
    relatedCommands: ["isolate"],
    workflowNotes: "Outliner provides a hierarchical tree view of scene structure, enabling organization, naming, and visibility control. In Roslyn's organizational ontology, the outliner represents the logical structure of the model: how geometry is grouped, layered, and named. The outliner makes relationships explicit: what belongs to what, what is visible, what is locked. It enables bulk operations: hide an entire layer, rename a group, reorganize hierarchy. Ontologically, the outliner embodies the distinction between geometric structure (how things are shaped) and logical structure (how things are organized). It is the semantic layer that gives meaning and organization to geometric data.",
  },
  tolerance: {
    tips: [
      "Affects coincident point detection",
      "Tighter tolerance = more accurate, slower computation",
      "Controls when points are considered identical",
    ],
    relatedCommands: ["snapping"],
    workflowNotes: "Tolerance defines the threshold for geometric coincidence: how close two points must be to be considered identical. In Roslyn's precision ontology, tolerance represents the boundary between discrete and continuous: below the tolerance, points merge; above it, they remain distinct. Tolerance affects operations like snapping, Boolean, and surface joining. Tighter tolerance increases precision but may cause operations to fail on imperfect geometry. Looser tolerance is more forgiving but may merge points that should remain separate. Ontologically, tolerance embodies the practical limits of precision: the recognition that perfect mathematical coincidence is impossible in floating-point computation, so we define 'close enough'.",
  },
  status: {
    tips: [
      "Shows command prompts and cursor coordinates",
      "Helpful for learning commands and tracking position",
      "Displays current command state and instructions",
    ],
    relatedCommands: ["display"],
    workflowNotes: "Status displays command prompts, cursor coordinates, and system messages in the interface. In Roslyn's communication ontology, the status bar represents the system's voice: it tells you what it expects, what it's doing, where the cursor is. Status information provides feedback and guidance: command prompts explain what input is needed, coordinates show precise position, messages report operation results. Ontologically, the status bar embodies the dialogue between user and system: the system communicates its state and expectations, guiding the user through operations. It is the linguistic layer that makes geometric operations comprehensible.",
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
      "Floating text annotations for documentation",
    ],
    relatedNodes: ["panel", "textNote", "group"],
    workflowNotes: "Text creates floating annotations in the Numerica canvas for documenting workflows. In Numerica's organizational ontology, text nodes represent the linguistic layer: they add human-readable labels and explanations to the computational graph. Text nodes have no computational function—they don't process data or connect to other nodes—but they serve a crucial semantic role: making workflows comprehensible to others (and to your future self). Ontologically, text embodies the distinction between computation and communication: the graph computes, text explains. Text nodes are where the workflow becomes a story, where algorithmic logic becomes human narrative.",
  },
  group: {
    tips: [
      "Drag nodes into group or draw around them",
      "Double-click title to rename",
      "Collapse to save space and reduce visual complexity",
      "Groups can be nested for hierarchical organization",
    ],
    relatedNodes: ["text", "panel"],
    workflowNotes: "Group creates visual containers for organizing related nodes in the Numerica canvas. In Numerica's organizational ontology, groups represent logical clustering: nodes that work together can be visually grouped. Groups are purely organizational—they don't affect computation or data flow—but they make complex workflows comprehensible by imposing hierarchical structure. Collapsible groups allow hiding implementation details while showing high-level structure. Ontologically, groups embody the part-whole hierarchy: complex workflows are composed of subsystems, and groups make these subsystems explicit. Groups are where flat graphs become hierarchical structures.",
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
      "Combines display and pass-through functionality",
    ],
    relatedNodes: ["panel", "text"],
    workflowNotes: "Text Note combines display and pass-through: it shows connected data while also outputting it unchanged. In Numerica's data flow ontology, Text Note represents annotated pass-through: data flows through while being documented. Unlike Panel (which only displays), Text Note allows data to continue downstream. This enables inline documentation: add notes at key points without breaking the data flow. Ontologically, Text Note embodies transparent observation: the ability to inspect data without consuming or transforming it. It is the window into data flow that doesn't interrupt the flow.",
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
      "RGB values range 0-1 for shader compatibility",
      "Interactive color selection interface",
    ],
    relatedNodes: ["customMaterial", "vectorConstruct"],
    workflowNotes: "Color Picker provides interactive color selection, outputting both RGB vector (for shaders) and hex string (for web). In Numerica's data ontology, Color Picker represents the transformation from visual perception to numerical representation: color as human experience becomes color as three numbers. The RGB output (0-1 range) is suitable for shader inputs and material definitions. Ontologically, Color Picker embodies the quantification of visual quality: the reduction of color perception to three numerical channels. It is where aesthetic choice becomes computational data.",
  },
  customMaterial: {
    tips: [
      "Applies render color to geometry",
      "Does not affect geometry data—only visual appearance",
      "Color is a display property, not geometric property",
    ],
    relatedNodes: ["colorPicker", "geometryViewer"],
    workflowNotes: "Custom Material applies visual properties (color, opacity) to geometry without modifying geometric data. In Numerica's representation ontology, materials represent the separation between geometry (shape) and appearance (color, texture). Materials are metadata: they affect how geometry is displayed but not what the geometry is. This separation enables the same geometry to be shown with different materials for different purposes. Ontologically, Custom Material embodies the distinction between intrinsic properties (shape, size) and extrinsic properties (color, texture). It represents the visual layer that sits atop geometric structure.",
  },
  annotations: {
    tips: [
      "Anchors text labels to geometry or points",
      "Appears in Roslyn viewport",
      "Creates spatial text that moves with geometry",
    ],
    relatedNodes: ["dimensions", "text"],
    workflowNotes: "Annotations create text labels anchored to geometric features, appearing in the Roslyn viewport. In Numerica's communication ontology, annotations represent spatial labeling: text that exists in 3D space rather than on the 2D canvas. Annotations move with their anchor geometry, maintaining spatial relationships. They are essential for documentation, presentation, and communication: labeling parts, indicating dimensions, explaining features. Ontologically, annotations embody the integration of language and geometry: text becomes spatial, labels become part of the 3D scene. Annotations are where linguistic description meets geometric location.",
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
      "Provides alternative preview without embedded viewport",
    ],
    relatedNodes: ["geometryViewer", "customPreview", "previewFilter"],
    workflowNotes: "Custom Viewer designates geometry for preview in the main Roslyn viewport without embedding a mini viewport in the node. In Numerica's visualization ontology, Custom Viewer represents lightweight preview: marking geometry for display without the overhead of embedded rendering. This is useful for workflows where you want to see results in the main viewport rather than in node thumbnails. Ontologically, Custom Viewer embodies the separation between computation and visualization: the node computes and marks for display, the main viewport handles rendering. It represents preview as designation rather than embedding.",
  },
  customPreview: {
    tips: [
      "Combines geometry with Filter settings",
      "Geometry passes through unchanged",
      "Applies display properties without modifying geometry",
    ],
    relatedNodes: ["geometryViewer", "previewFilter"],
    workflowNotes: "Custom Preview combines geometry with display filter settings, applying visual properties (wireframe, ghosted, etc.) without modifying the geometry itself. In Numerica's visualization ontology, Custom Preview represents the separation of geometry from its display properties: the same geometry can be previewed with different visual styles. The geometry passes through unchanged, enabling downstream nodes to receive unmodified data. Ontologically, Custom Preview embodies the distinction between data and presentation: geometry is data, display settings are presentation. It allows controlling how geometry appears without changing what it is.",
  },
  previewFilter: {
    tips: [
      "Configure display mode, solidity, sheen",
      "Connect to Filter input of viewers",
      "Defines visual style without affecting geometry",
    ],
    relatedNodes: ["geometryViewer", "customPreview"],
    workflowNotes: "Preview Filter creates display property configurations that can be connected to viewer nodes. In Numerica's visualization ontology, Preview Filter represents reusable display styles: define once, apply to multiple viewers. Filters control display mode (shaded, wireframe, ghosted), solidity (opaque, transparent), and sheen (matte, glossy). Filters are pure metadata: they don't modify geometry, only how it's rendered. Ontologically, Preview Filter embodies the parameterization of visual style: display properties become data that can be stored, passed, and reused. It represents the separation of visual style from geometric content.",
  },
  metadataPanel: {
    tips: [
      "Shows vertex/face count, bounds, area, volume",
      "Use for validation and documentation",
      "Automatically extracts geometric properties",
    ],
    relatedNodes: ["geometryInfo", "panel"],
    workflowNotes: "Metadata Panel displays comprehensive geometric properties: vertex/face counts, bounding box dimensions, surface area, volume, and other computed metrics. In Numerica's analysis ontology, Metadata Panel represents automatic property extraction: connect geometry, see its properties. The panel computes and displays properties without requiring explicit extraction nodes. This is essential for validation (does this mesh have the expected vertex count?), documentation (what is the surface area?), and quality control. Ontologically, Metadata Panel embodies the introspection of geometry: the ability to query geometric objects for their properties, transforming implicit characteristics into explicit data.",
  },
  dimensions: {
    tips: [
      "Shows live bounding box measurements",
      "Updates automatically as geometry changes",
      "Displays width, depth, height of bounding box",
    ],
    relatedNodes: ["measurement", "geometryInfo"],
    workflowNotes: "Dimensions displays the bounding box measurements of connected geometry, showing width, depth, and height. In Numerica's measurement ontology, Dimensions represents automatic dimensional analysis: connect geometry, see its extents. The measurements update live as upstream parameters change, enabling real-time dimensional feedback during parametric exploration. Dimensions are essential for ensuring geometry fits within constraints, for documentation, and for driving dimensional relationships. Ontologically, Dimensions embodies the quantification of spatial extent: transforming geometric bounds into numerical measurements. It is where geometry becomes measurable, where form becomes dimension.",
  },

  // === PRIMITIVES ===
  point: {
    tips: [
      "Creates point at XYZ coordinates",
      "Use as reference or curve control vertex",
      "Parametric point creation in Numerica",
    ],
    relatedNodes: ["pointCloud", "line"],
    workflowNotes: "Point node creates zero-dimensional geometric primitives parametrically. In Numerica's generative ontology, Point represents the algorithmic creation of position: XYZ coordinates become geometric location. Unlike Roslyn's interactive point placement, Numerica points are fully parametric: connect sliders to X/Y/Z inputs and the point moves as parameters change. This enables point-based parametric relationships: points can be calculated, derived from other geometry, or driven by mathematical expressions. Ontologically, Numerica Point embodies the transformation from number to geometry: three numbers become a location in space through computational instantiation.",
  },
  pointCloud: {
    tips: [
      "Creates collection from coordinate lists",
      "Input vectors or separate X,Y,Z lists",
      "Generates multiple points from data",
    ],
    relatedNodes: ["point", "voronoiPattern"],
    workflowNotes: "Point Cloud creates collections of points from lists of coordinates, enabling data-driven point generation. In Numerica's data-to-geometry ontology, Point Cloud represents bulk geometric instantiation: lists of numbers become clouds of points. Point clouds can be generated from mathematical functions, imported data, or algorithmic patterns. They serve as input for Voronoi patterns, convex hulls, and point-based modeling. Ontologically, Point Cloud embodies the transformation from tabular data to spatial distribution: rows of coordinates become geometric scatter plots in 3D space.",
  },
  line: {
    tips: [
      "Creates segment between start and end points",
      "Outputs line geometry and length value",
      "Parametric line creation from point inputs",
    ],
    relatedNodes: ["polyline", "pipeSweep"],
    workflowNotes: "Line node creates one-dimensional segments parametrically from start and end points. In Numerica's generative ontology, Line represents algorithmic edge creation: two points define a segment. The node outputs both the line geometry (for geometric operations) and its length (for dimensional calculations). Lines can be generated from parametric points, enabling dynamic edge networks. Ontologically, Numerica Line embodies the connection operator: it transforms two discrete points into a continuous path, representing the fundamental geometric operation of connecting.",
  },
  polyline: {
    tips: [
      "Connects points with straight segments",
      "Closed option links last to first",
      "Creates connected paths from point lists",
    ],
    relatedNodes: ["line", "curve", "fillet"],
    workflowNotes: "Polyline node creates connected sequences of line segments from lists of points. In Numerica's generative ontology, Polyline represents algorithmic path creation: an ordered list of points becomes a connected curve. The closed parameter determines whether the path loops back to the start. Polylines generated in Numerica can be driven by parametric point positions, enabling dynamic path generation. Ontologically, Polyline embodies sequence and connectivity: it transforms discrete points into continuous paths while preserving order and topology.",
  },
  rectangle: {
    tips: [
      "Creates closed 4-vertex polyline",
      "Set width, height, and center parametrically",
      "Generates axis-aligned rectangular profiles",
    ],
    relatedNodes: ["circle", "extrude"],
    workflowNotes: "Rectangle node creates parametric rectangular profiles from width, height, and center parameters. In Numerica's generative ontology, Rectangle represents algorithmic rectilinear form: dimensions become geometry through computational rules. Connect sliders to width/height and the rectangle resizes dynamically. Rectangles are fundamental profiles for extrusion, surface creation, and boundary definition. Ontologically, Numerica Rectangle embodies dimensional parameterization: the rectangle's form is determined entirely by numerical parameters, enabling exploration of proportional relationships and dimensional variations.",
  },
  circle: {
    tips: [
      "Creates NURBS circle parametrically",
      "Set center point and radius",
      "Perfect circular form for profiles and patterns",
    ],
    relatedNodes: ["arc", "extrude"],
    workflowNotes: "Circle node creates parametric NURBS circles from center and radius parameters. In Numerica's generative ontology, Circle represents algorithmic radial form: a center point and radius value become perfect circular geometry. Connect a slider to radius and the circle scales dynamically. Circles are essential for creating cylindrical forms (via extrusion), radial patterns, and circular boundaries. Ontologically, Numerica Circle embodies radial parameterization: the circle's form is determined by a single dimension (radius) and a location (center), enabling exploration of scale while maintaining perfect circularity.",
  },
  arc: {
    tips: [
      "Creates arc from angular parameters",
      "Set center, radius, start/end angles",
      "Parametric circular segments",
    ],
    relatedNodes: ["circle", "curve"],
    workflowNotes: "Arc node creates parametric circular arcs from center, radius, and angular parameters. In Numerica's generative ontology, Arc represents algorithmic partial rotation: angles define which portion of a circle is generated. Connect sliders to start/end angles and the arc sweeps dynamically. Arcs are essential for creating rounded transitions, partial circular features, and angular patterns. Ontologically, Numerica Arc embodies angular parameterization: the arc's extent is determined by angular bounds, enabling exploration of sweep angles and circular segments.",
  },
  curve: {
    tips: [
      "Creates NURBS curves through control points",
      "Degree parameter controls smoothness",
      "Parametric freeform curve generation",
    ],
    relatedNodes: ["polyline", "loft"],
    workflowNotes: "Curve node creates parametric NURBS curves from lists of control points. In Numerica's generative ontology, Curve represents algorithmic freeform generation: control points and degree parameters become smooth curves through NURBS mathematics. Control points can be parametrically generated, enabling dynamic curve shapes. Curves are essential for lofting, sweeping, and defining organic boundaries. Ontologically, Numerica Curve embodies the parameterization of smooth form: curves are determined by control point positions and mathematical degree, enabling exploration of flowing, organic shapes through parameter variation.",
  },
  box: {
    tips: [
      "Set width, depth, height parametrically",
      "Center parameter positions the box",
      "Generates mesh box primitives",
    ],
    relatedNodes: ["sphere", "boolean"],
    workflowNotes: "Box node creates parametric rectangular prisms from dimensional parameters. In Numerica's generative ontology, Box represents algorithmic rectilinear solid generation: three dimensions and a center point become box geometry. Connect sliders to width/depth/height and the box resizes dynamically. Boxes are fundamental building blocks for architectural massing, mechanical parts, and Boolean operations. Ontologically, Numerica Box embodies three-dimensional parameterization: the box's form is determined entirely by three orthogonal dimensions, enabling exploration of proportional relationships and volumetric variations.",
  },
  sphere: {
    tips: [
      "Set radius and segment count parametrically",
      "Higher segments = smoother approximation",
      "Generates mesh sphere primitives",
    ],
    relatedNodes: ["box", "geodesicSphere"],
    workflowNotes: "Sphere node creates parametric spherical meshes from radius and segment parameters. In Numerica's generative ontology, Sphere represents algorithmic radial solid generation: a radius and tessellation density become spherical geometry. Connect a slider to radius and the sphere scales dynamically. The segments parameter controls mesh resolution: higher values create smoother spheres at the cost of more triangles. Ontologically, Numerica Sphere embodies the parameterization of perfect form: spheres are determined by a single dimension (radius) and a quality parameter (segments), enabling exploration of scale and resolution.",
  },
  primitive: {
    tips: [
      "Generic node with selectable primitive type",
      "Parameters adapt to selected shape",
      "Unified interface for all primitive types",
    ],
    relatedNodes: ["box", "sphere"],
    workflowNotes: "Primitive node provides a unified interface for creating various geometric primitives (box, sphere, cylinder, etc.) with a type selector. In Numerica's generative ontology, Primitive represents polymorphic form generation: a single node type can generate multiple primitive shapes based on a type parameter. This reduces graph complexity: one node type instead of many. The parameters adapt to the selected primitive type, showing only relevant controls. Ontologically, Primitive embodies the abstraction of primitive generation: the recognition that all primitives share common patterns (center, dimensions, tessellation) despite their different forms.",
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
