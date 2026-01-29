import { PRIMITIVE_CATALOG } from "./primitiveCatalog";

const PRIMITIVE_COMMAND_DESCRIPTIONS = Object.fromEntries(
  PRIMITIVE_CATALOG.map((entry) => [
    entry.id,
    {
      description: `Click to place the base on the C-Plane, drag or type a size, then click to confirm the ${entry.label}. Esc cancels.`,
      category: "geometry",
    },
  ])
);

export const COMMAND_SEMANTICS: Record<string, string> = {
  geometry:
    "Creates or converts geometry directly in Roslyn using the active construction plane and cursor input.",
  transform:
    "Repositions geometry by applying spatial transforms. Outputs stay linked to selection state and gumball input.",
  edit: "Edits selection, clipboard, or history state without generating new geometry.",
  view: "Changes the camera frame, projection, or viewport focus for spatial clarity.",
  performs:
    "Runs a modeling action on the current selection, emphasizing procedural intent over manual edits.",
};

export const COMMAND_DESCRIPTIONS: Record<
  string,
  { description: string; shortcut?: string; category: string }
> = {
  point: {
    description: "Click to place a point on the active C-Plane. Use snaps for precision; Esc cancels.",
    shortcut: "V",
    category: "geometry",
  },
  line: {
    description:
      "Click start and end points, then keep clicking to chain segments. Double-click or Enter to finish; Esc cancels.",
    category: "geometry",
  },
  polyline: {
    description:
      "Click to add vertices; right-click, Enter, or double-click to finish. Esc cancels.",
    shortcut: "P",
    category: "geometry",
  },
  rectangle: {
    description:
      "Click the first corner, then the opposite corner. Type width,height for an exact size.",
    shortcut: "R",
    category: "geometry",
  },
  circle: {
    description: "Click the center, then the radius. Type a value to set exact size.",
    shortcut: "C",
    category: "geometry",
  },
  arc: {
    description:
      "Click start, click end, then click a bulge point to set curvature. Enter to finish.",
    category: "geometry",
  },
  curve: {
    description:
      "Click control points to shape the curve. Right-click or double-click to finish.",
    category: "geometry",
  },
  nurbsbox: {
    description:
      "Click to place the base on the C-Plane, drag or type a size, then confirm. Esc cancels.",
    category: "geometry",
  },
  nurbssphere: {
    description:
      "Click to place the base on the C-Plane, drag or type a size, then confirm. Esc cancels.",
    category: "geometry",
  },
  nurbscylinder: {
    description:
      "Click to place the base on the C-Plane, drag or type a size, then confirm. Esc cancels.",
    category: "geometry",
  },
  ...PRIMITIVE_COMMAND_DESCRIPTIONS,
  interpolate: {
    description:
      "Convert polylines into smooth NURBS by interpolating through vertices. Select curves, then Run.",
    shortcut: "I",
    category: "geometry",
  },
  surface: {
    description:
      "Create a planar surface from a closed curve or polyline. Select the boundary, then Run.",
    shortcut: "S",
    category: "geometry",
  },
  loft: {
    description:
      "Loft between two or more curves; order matters. Select profiles in sequence, then Run.",
    shortcut: "L",
    category: "geometry",
  },
  extrude: {
    description:
      "Extrude a profile or surface along the C-Plane normal. Drag to set distance or type a value.",
    shortcut: "E",
    category: "geometry",
  },
  meshconvert: {
    description:
      "Triangulate NURBS curves or surfaces into editable meshes for rendering and mesh edits.",
    category: "geometry",
  },
  breptomesh: {
    description:
      "Tessellate B-Rep solids into renderable meshes for downstream mesh editing.",
    category: "geometry",
  },
  meshtobrep: {
    description:
      "Convert meshes into triangle-based B-Rep solids for topology-aware workflows.",
    category: "geometry",
  },
  nurbsrestore: {
    description:
      "Attempt to rebuild NURBS curves or surfaces from converted meshes. Best for recent conversions.",
    category: "geometry",
  },
  meshmerge: {
    description: "Combine selected meshes into a single mesh object.",
    category: "geometry",
  },
  meshflip: {
    description: "Flip mesh normals and triangle winding to fix inside-out faces.",
    category: "geometry",
  },
  meshthicken: {
    description: "Offset mesh along normals and cap edges to add thickness.",
    category: "geometry",
  },
  move: {
    description: "Drag gumball axes or type XYZ to translate the selection precisely.",
    shortcut: "G",
    category: "transform",
  },
  rotate: {
    description: "Drag a rotation ring or type an angle. Uses the current pivot.",
    shortcut: "⌘R",
    category: "transform",
  },
  scale: {
    description:
      "Drag scale handles or type factors. Hold Shift for uniform scale around the pivot.",
    shortcut: "⌘S",
    category: "transform",
  },
  offset: {
    description: "Offset selected curves by a distance; positive/negative controls direction.",
    category: "transform",
  },
  mirror: {
    description: "Mirror selected geometry across a line or plane you define.",
    category: "transform",
  },
  array: {
    description: "Duplicate selection along a vector with spacing and count controls.",
    category: "transform",
  },
  gumball: {
    description:
      "Use handles to move, rotate, or scale. Click again to confirm, Esc cancels.",
    shortcut: "W",
    category: "transform",
  },
  undo: {
    description: "Undo the last action. Repeat to step back through history.",
    shortcut: "⌘Z",
    category: "edit",
  },
  redo: {
    description: "Redo the last undone action.",
    shortcut: "⌘⇧Z",
    category: "edit",
  },
  copy: {
    description: "Copy the selected geometry to the clipboard.",
    shortcut: "⌘C",
    category: "edit",
  },
  paste: {
    description: "Paste geometry from the clipboard. Choose in place, cursor, or origin.",
    shortcut: "⌘V",
    category: "edit",
  },
  duplicate: {
    description: "Duplicate the current selection in place.",
    shortcut: "⌘D",
    category: "edit",
  },
  delete: {
    description: "Delete the selected geometry.",
    shortcut: "⌫",
    category: "edit",
  },
  focus: {
    description: "Frame the current selection for a tight view.",
    shortcut: "F",
    category: "view",
  },
  frameall: {
    description: "Frame all visible geometry.",
    shortcut: "⇧F",
    category: "view",
  },
  screenshot: {
    description: "Capture the current Roslyn viewport and open the export preview.",
    category: "view",
  },
};
