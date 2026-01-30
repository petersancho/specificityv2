import { PRIMITIVE_CATALOG } from "./primitiveCatalog";

/**
 * Primitive command descriptions - generated from the catalog.
 */
const PRIMITIVE_COMMAND_DESCRIPTIONS = Object.fromEntries(
  PRIMITIVE_CATALOG.map((entry) => [
    entry.id,
    {
      description: `Create a ${entry.label} on the C-Plane. Click to place base, drag to size, click to confirm. Esc cancels.`,
      category: "geometry",
    },
  ])
);

/**
 * Category-level semantic descriptions shown on detail pages.
 */
export const COMMAND_SEMANTICS: Record<string, string> = {
  geometry:
    "Creates geometry on the active C-Plane using cursor input and snaps. Geometry commands produce new objects that become part of your model.",
  transform:
    "Repositions, orients, or scales geometry. Transform commands modify existing geometry while preserving topology.",
  edit:
    "Manages selection, clipboard, and history. Edit commands control workflow without generating new geometry.",
  view:
    "Changes camera, display mode, or viewport focus. View commands affect visualization, not geometry.",
  performs:
    "Runs a modeling action on the current selection. May create, modify, or analyze geometry based on parameters.",
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
    description: "Place a point on the C-Plane. Use snaps for precision. Esc cancels.",
    shortcut: "V",
    category: "geometry",
  },
  line: {
    description: "Click start and end points to create segments. Double-click or Enter to finish.",
    shortcut: "L",
    category: "geometry",
  },
  polyline: {
    description: "Click to add vertices. Right-click or Enter to finish. Close by clicking near start.",
    shortcut: "P",
    category: "geometry",
  },
  rectangle: {
    description: "Click first corner, then opposite corner. Type width,height for exact dimensions.",
    shortcut: "R",
    category: "geometry",
  },
  circle: {
    description: "Click center, then radius. Type a value for exact size.",
    shortcut: "C",
    category: "geometry",
  },
  arc: {
    description: "Click start, end, then a bulge point. Three-point arc definition.",
    shortcut: "A",
    category: "geometry",
  },
  curve: {
    description: "Click control points to shape the curve. Right-click or double-click to finish.",
    category: "geometry",
  },

  // === GEOMETRY: NURBS ===
  nurbsbox: {
    description: "Create a NURBS box with mathematically exact surfaces.",
    category: "geometry",
  },
  nurbssphere: {
    description: "Create a NURBS sphere with exact curvature.",
    category: "geometry",
  },
  nurbscylinder: {
    description: "Create a NURBS cylinder with exact circular cross-section.",
    category: "geometry",
  },

  // === GEOMETRY: Primitives (from catalog) ===
  ...PRIMITIVE_COMMAND_DESCRIPTIONS,

  // === GEOMETRY: Conversion ===
  interpolate: {
    description: "Convert polylines to smooth NURBS curves by interpolating through vertices.",
    shortcut: "I",
    category: "geometry",
  },
  surface: {
    description: "Create a planar surface from a closed curve. Select boundary, then Run.",
    shortcut: "S",
    category: "geometry",
  },
  loft: {
    description: "Loft between curves. Select profiles in order, then Run.",
    shortcut: "O",
    category: "geometry",
  },
  extrude: {
    description: "Extrude a profile along C-Plane normal. Drag or type distance.",
    shortcut: "E",
    category: "geometry",
  },
  boolean: {
    description: "Boolean Union/Difference/Intersection on solids. Select targets, then Run.",
    category: "performs",
  },

  // === GEOMETRY: Mesh Operations ===
  meshconvert: {
    description: "Convert NURBS to mesh for rendering or mesh editing.",
    category: "geometry",
  },
  breptomesh: {
    description: "Tessellate B-Rep solids into mesh geometry.",
    category: "geometry",
  },
  meshtobrep: {
    description: "Convert mesh to B-Rep solid for topology-aware operations.",
    category: "geometry",
  },
  nurbsrestore: {
    description: "Restore NURBS from converted meshes. Best for recent conversions.",
    category: "geometry",
  },
  meshmerge: {
    description: "Combine selected meshes into one object.",
    category: "geometry",
  },
  meshflip: {
    description: "Flip mesh normals to fix inside-out faces.",
    category: "geometry",
  },
  meshthicken: {
    description: "Add thickness by offsetting along normals. Set distance and cap options.",
    category: "geometry",
  },

  // === TRANSFORM ===
  transform: {
    description: "Access gumball for move, rotate, and scale. Drag handles or type values.",
    shortcut: "T",
    category: "transform",
  },
  move: {
    description: "Translate selection. Drag axes or type XYZ displacement.",
    shortcut: "G",
    category: "transform",
  },
  rotate: {
    description: "Rotate around axis. Drag rings or type angle. Uses current pivot.",
    shortcut: "⌘R",
    category: "transform",
  },
  scale: {
    description: "Scale from pivot. Drag handles or type factors. Shift for uniform.",
    shortcut: "⌘S",
    category: "transform",
  },
  offset: {
    description: "Offset curves by distance. Positive outward, negative inward.",
    category: "transform",
  },
  mirror: {
    description: "Mirror across a line or plane. Click two points to define axis.",
    shortcut: "M",
    category: "transform",
  },
  array: {
    description: "Create copies along a vector. Set direction, spacing, and count.",
    category: "transform",
  },
  gumball: {
    description: "Toggle gumball widget. Drag to transform, click to confirm.",
    shortcut: "W",
    category: "transform",
  },
  morph: {
    description: "Sculpt geometry with brush-based deformation. Click-drag on surface.",
    category: "transform",
  },

  // === EDIT ===
  undo: {
    description: "Undo last action. Repeat to step through history.",
    shortcut: "⌘Z",
    category: "edit",
  },
  redo: {
    description: "Redo last undone action.",
    shortcut: "⌘⇧Z",
    category: "edit",
  },
  copy: {
    description: "Copy selection to clipboard.",
    shortcut: "⌘C",
    category: "edit",
  },
  paste: {
    description: "Paste from clipboard. Choose in place, cursor, or origin.",
    shortcut: "⌘V",
    category: "edit",
  },
  duplicate: {
    description: "Duplicate selection in place.",
    shortcut: "⌘D",
    category: "edit",
  },
  delete: {
    description: "Delete selected geometry.",
    shortcut: "⌫",
    category: "edit",
  },
  cancel: {
    description: "Cancel active command without committing.",
    shortcut: "Esc",
    category: "edit",
  },
  confirm: {
    description: "Confirm and commit active command.",
    shortcut: "↵",
    category: "edit",
  },

  // === VIEW ===
  focus: {
    description: "Frame selection in viewport. If nothing selected, frames all.",
    shortcut: "F",
    category: "view",
  },
  frameall: {
    description: "Frame all visible geometry in viewport.",
    shortcut: "⇧F",
    category: "view",
  },
  screenshot: {
    description: "Capture viewport to image. Opens export preview.",
    category: "view",
  },
  view: {
    description: "Switch between Top/Front/Right/Perspective views.",
    category: "view",
  },
  camera: {
    description: "Toggle camera options: zoom to cursor, invert zoom, keep upright.",
    category: "view",
  },
  pivot: {
    description: "Set pivot location. Choose mode or click to place.",
    category: "view",
  },
  orbit: {
    description: "Orbit camera around scene. Right-click drag.",
    category: "view",
  },
  pan: {
    description: "Pan camera. Middle-click drag or Shift+right-click.",
    category: "view",
  },
  zoom: {
    description: "Zoom in/out. Scroll wheel or zoom handles.",
    category: "view",
  },
  display: {
    description: "Switch display mode: wireframe, shaded, ghosted, silhouette.",
    category: "view",
  },
  isolate: {
    description: "Isolate or hide selection. Click again to show all.",
    category: "view",
  },

  // === UTILITY ===
  selectionfilter: {
    description: "Set selection filter: Object, Vertex, Edge, or Face.",
    category: "performs",
  },
  cycle: {
    description: "Cycle through overlapping objects under cursor.",
    shortcut: "Tab",
    category: "performs",
  },
  snapping: {
    description: "Toggle snap types: grid, vertex, endpoint, midpoint, intersection.",
    category: "performs",
  },
  grid: {
    description: "Configure grid spacing, units, and adaptive mode.",
    category: "performs",
  },
  cplane: {
    description: "Set C-Plane to world XY/XZ/YZ or define by 3 points.",
    category: "performs",
  },
  outliner: {
    description: "Open outliner to manage hierarchy, layers, and visibility.",
    category: "performs",
  },
  tolerance: {
    description: "Set absolute and angle tolerance for geometry operations.",
    category: "performs",
  },
  status: {
    description: "Toggle status bar visibility and display options.",
    category: "performs",
  },
};
