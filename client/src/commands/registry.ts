import { PRIMITIVE_CATALOG, PRIMITIVE_COMMAND_ALIAS_ENTRIES } from "../data/primitiveCatalog";

export type CommandCategory = "geometry" | "performs";

export type CommandDefinition = {
  id: string;
  label: string;
  category: CommandCategory;
  prompt: string;
};

export const COMMAND_PREFIX = /^(geometry|perform|performs)\s*[:\-]?\s*/;

const primitivePrompt = (label: string) =>
  `${label}: click to set base on the C-Plane, move to size, click to place. Esc cancels.`;

const PRIMITIVE_COMMAND_DEFINITIONS: CommandDefinition[] = PRIMITIVE_CATALOG.map((entry) => ({
  id: entry.id,
  label: entry.label,
  category: "geometry",
  prompt: primitivePrompt(entry.label),
}));

const NURBS_PRIMITIVE_DEFINITIONS: CommandDefinition[] = [
  {
    id: "nurbsbox",
    label: "NURBS Box",
    category: "geometry",
    prompt: primitivePrompt("NURBS Box"),
  },
  {
    id: "nurbssphere",
    label: "NURBS Sphere",
    category: "geometry",
    prompt: primitivePrompt("NURBS Sphere"),
  },
  {
    id: "nurbscylinder",
    label: "NURBS Cylinder",
    category: "geometry",
    prompt: primitivePrompt("NURBS Cylinder"),
  },
];

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "point",
    label: "Point",
    category: "geometry",
    prompt:
      "Point: click to place a point. Esc cancels.",
  },
  ...PRIMITIVE_COMMAND_DEFINITIONS,
  {
    id: "line",
    label: "Line",
    category: "geometry",
    prompt:
      "Line: click start, click end to place a segment. Double-click to finish. Esc cancels.",
  },
  {
    id: "polyline",
    label: "Polyline",
    category: "geometry",
    prompt:
      "Polyline: click points to draw. Right-click or double-click to finish. Esc cancels.",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    category: "geometry",
    prompt:
      "Rectangle: click first corner, click opposite corner to place. Esc cancels.",
  },
  {
    id: "circle",
    label: "Circle",
    category: "geometry",
    prompt:
      "Circle: click center, click radius to place. Esc cancels.",
  },
  {
    id: "arc",
    label: "Arc",
    category: "geometry",
    prompt:
      "Arc: click start, click end, click a point on the arc. Double-click to finish. Esc cancels.",
  },
  {
    id: "curve",
    label: "Curve",
    category: "geometry",
    prompt:
      "Curve: click points to shape the curve. Right-click or double-click to finish. Esc cancels.",
  },
  ...NURBS_PRIMITIVE_DEFINITIONS,
  {
    id: "meshconvert",
    label: "NURBS to Mesh",
    category: "performs",
    prompt: "NURBS to Mesh: select NURBS curves or surfaces, then click Run or press Enter.",
  },
  {
    id: "breptomesh",
    label: "B-Rep to Mesh",
    category: "performs",
    prompt: "B-Rep to Mesh: select B-Rep solids, then click Run or press Enter.",
  },
  {
    id: "meshtobrep",
    label: "Mesh to B-Rep",
    category: "performs",
    prompt: "Mesh to B-Rep: select meshes, then click Run or press Enter.",
  },
  {
    id: "nurbsrestore",
    label: "Mesh to NURBS",
    category: "performs",
    prompt:
      "Mesh to NURBS: select a mesh converted from NURBS, then click Run or press Enter.",
  },
  {
    id: "interpolate",
    label: "Interpolate",
    category: "performs",
    prompt: "Interpolate: select polylines, then click Run or press Enter to convert.",
  },
  {
    id: "boolean",
    label: "Boolean",
    category: "performs",
    prompt: "Boolean: select solids, then click Run to combine. Esc cancels.",
  },
  {
    id: "loft",
    label: "Loft",
    category: "performs",
    prompt: "Loft: select two or more curves, then click Run or press Enter. Esc cancels.",
  },
  {
    id: "surface",
    label: "Surface",
    category: "performs",
    prompt:
      "Surface: select a closed curve, then click Run or press Enter. Esc cancels.",
  },
  {
    id: "extrude",
    label: "Extrude",
    category: "performs",
    prompt:
      "Extrude: select a profile, then drag to set distance or enter a value.",
  },
  {
    id: "meshmerge",
    label: "Mesh Merge",
    category: "performs",
    prompt: "Mesh Merge: select meshes, then click Run or press Enter to combine.",
  },
  {
    id: "meshflip",
    label: "Mesh Flip",
    category: "performs",
    prompt: "Mesh Flip: select meshes, then click Run or press Enter to flip normals.",
  },
  {
    id: "meshthicken",
    label: "Mesh Thicken",
    category: "performs",
    prompt:
      "Mesh Thicken: select meshes, set thickness/sides, then click Run or press Enter.",
  },
  {
    id: "transform",
    label: "Transform",
    category: "performs",
    prompt: "Transform: select geometry, drag gumball handles or enter values.",
  },
  {
    id: "move",
    label: "Move",
    category: "performs",
    prompt: "Move: select geometry, drag a gumball handle or enter XYZ values.",
  },
  {
    id: "rotate",
    label: "Rotate",
    category: "performs",
    prompt: "Rotate: select geometry, drag a rotation ring or enter an angle.",
  },
  {
    id: "scale",
    label: "Scale",
    category: "performs",
    prompt: "Scale: select geometry, drag a scale handle or enter values.",
  },
  {
    id: "offset",
    label: "Offset",
    category: "performs",
    prompt:
      "Offset: select curves, then click to set distance.",
  },
  {
    id: "mirror",
    label: "Mirror",
    category: "performs",
    prompt: "Mirror: select geometry, then click to define the mirror line or plane.",
  },
  {
    id: "array",
    label: "Array",
    category: "performs",
    prompt: "Array: select geometry, then set direction, spacing, and count.",
  },
  {
    id: "gumball",
    label: "Gumball",
    category: "performs",
    prompt: "Gumball: click a handle to move/rotate/scale, click again to confirm.",
  },
  {
    id: "undo",
    label: "Undo",
    category: "performs",
    prompt: "Undo: click or press Cmd/Ctrl+Z to undo the last action.",
  },
  {
    id: "redo",
    label: "Redo",
    category: "performs",
    prompt: "Redo: click or press Cmd+Shift+Z or Ctrl+Y.",
  },
  {
    id: "copy",
    label: "Copy",
    category: "performs",
    prompt: "Copy: click or press Cmd/Ctrl+C to copy selection.",
  },
  {
    id: "paste",
    label: "Paste",
    category: "performs",
    prompt: "Paste: click or press Cmd/Ctrl+V. Choose placement: in place, cursor, origin.",
  },
  {
    id: "duplicate",
    label: "Duplicate",
    category: "performs",
    prompt: "Duplicate: click or press Cmd/Ctrl+D. Alt-drag also duplicates.",
  },
  {
    id: "delete",
    label: "Delete",
    category: "performs",
    prompt: "Delete: click or press Delete/Backspace to remove selection.",
  },
  {
    id: "cancel",
    label: "Cancel",
    category: "performs",
    prompt: "Cancel: click or press Esc to cancel the active command.",
  },
  {
    id: "confirm",
    label: "Confirm",
    category: "performs",
    prompt: "Confirm: click or press Enter to commit the active command.",
  },
  {
    id: "focus",
    label: "Focus",
    category: "performs",
    prompt: "Focus: click to frame the current selection.",
  },
  {
    id: "frameall",
    label: "Frame All",
    category: "performs",
    prompt: "Frame All: click to frame all visible geometry.",
  },
  {
    id: "screenshot",
    label: "Screenshot",
    category: "performs",
    prompt: "Screenshot: capture the current Roslyn viewport and open the export preview.",
  },
  {
    id: "view",
    label: "View",
    category: "performs",
    prompt: "View: click to switch to top/front/right/perspective.",
  },
  {
    id: "camera",
    label: "Camera",
    category: "performs",
    prompt: "Camera: click to toggle camera options (zoom to cursor, invert zoom, upright).",
  },
  {
    id: "pivot",
    label: "Pivot",
    category: "performs",
    prompt: "Pivot: click a pivot mode, then click a point to place it.",
  },
  {
    id: "orbit",
    label: "Orbit",
    category: "performs",
    prompt: "Orbit: click-drag (right mouse) to orbit the view.",
  },
  {
    id: "pan",
    label: "Pan",
    category: "performs",
    prompt: "Pan: click-drag (middle mouse or Shift+right) to pan.",
  },
  {
    id: "zoom",
    label: "Zoom",
    category: "performs",
    prompt: "Zoom: scroll to zoom in/out. Click to toggle zoom mode.",
  },
  {
    id: "selectionfilter",
    label: "Selection Filter",
    category: "performs",
    prompt: "Selection Filter: click Object/Vertex/Edge/Face to change picks.",
  },
  {
    id: "cycle",
    label: "Cycle Selection",
    category: "performs",
    prompt: "Cycle: click to cycle overlapping picks (Tab also works).",
  },
  {
    id: "snapping",
    label: "Snapping",
    category: "performs",
    prompt: "Snapping: click to toggle grid/vertex/endpoint/midpoint/intersection.",
  },
  {
    id: "grid",
    label: "Grid",
    category: "performs",
    prompt: "Grid: click to change spacing/units or toggle adaptive grid.",
  },
  {
    id: "cplane",
    label: "C-Plane",
    category: "performs",
    prompt: "C-Plane: click world XY/XZ/YZ or click 3 points to define a plane.",
  },
  {
    id: "display",
    label: "Display",
    category: "performs",
    prompt: "Display: click to switch wireframe/shaded/edges/ghosted/silhouette.",
  },
  {
    id: "isolate",
    label: "Isolate",
    category: "performs",
    prompt: "Isolate: click to hide/lock selection; click again to show all.",
  },
  {
    id: "outliner",
    label: "Outliner",
    category: "performs",
    prompt: "Outliner: click to manage groups, layers, and visibility.",
  },
  {
    id: "tolerance",
    label: "Tolerance",
    category: "performs",
    prompt: "Tolerance: click to set absolute and angle tolerance.",
  },
  {
    id: "status",
    label: "Status",
    category: "performs",
    prompt: "Status: click to toggle command help/status bar.",
  },
  {
    id: "morph",
    label: "Morph",
    category: "performs",
    prompt: "Morph: select geometry, then click-drag to sculpt. Esc cancels.",
  },
];

const BASE_COMMAND_ALIASES: Record<string, string> = {
  verticee: "point",
  vertex: "point",
  point: "point",
  pt: "point",
  p: "point",
  line: "line",
  ln: "line",
  l: "line",
  arc: "arc",
  a: "arc",
  curve: "curve",
  crv: "curve",
  cv: "curve",
  "poly-line": "polyline",
  polyline: "polyline",
  pline: "polyline",
  pl: "polyline",
  rect: "rectangle",
  rectangle: "rectangle",
  rec: "rectangle",
  circle: "circle",
  circ: "circle",
  c: "circle",
  ext: "extrude",
  ex: "extrude",
  nurbstomesh: "meshconvert",
  nurbsmesh: "meshconvert",
  "nurbs-to-mesh": "meshconvert",
  nurbs2mesh: "meshconvert",
  n2m: "meshconvert",
  nurbsbox: "nurbsbox",
  "nurbs-box": "nurbsbox",
  nbox: "nurbsbox",
  nurbssphere: "nurbssphere",
  "nurbs-sphere": "nurbssphere",
  nsphere: "nurbssphere",
  nsph: "nurbssphere",
  nurbscylinder: "nurbscylinder",
  "nurbs-cylinder": "nurbscylinder",
  ncylinder: "nurbscylinder",
  ncyl: "nurbscylinder",
  meshtonurbs: "nurbsrestore",
  "mesh-to-nurbs": "nurbsrestore",
  mesh2nurbs: "nurbsrestore",
  m2n: "nurbsrestore",
  meshmerge: "meshmerge",
  "mesh-merge": "meshmerge",
  mergemesh: "meshmerge",
  meshflip: "meshflip",
  "mesh-flip": "meshflip",
  flipmesh: "meshflip",
  meshthicken: "meshthicken",
  "mesh-thicken": "meshthicken",
  thickenmesh: "meshthicken",
  move: "move",
  mv: "move",
  m: "move",
  translate: "move",
  rotate: "rotate",
  rot: "rotate",
  ro: "rotate",
  scale: "scale",
  sc: "scale",
  offset: "offset",
  off: "offset",
  mirror: "mirror",
  mir: "mirror",
  array: "array",
  arr: "array",
  gizmo: "gumball",
  gumball: "gumball",
  undo: "undo",
  redo: "redo",
  copy: "copy",
  paste: "paste",
  duplicate: "duplicate",
  delete: "delete",
  del: "delete",
  frame: "focus",
  "frame-all": "frameall",
  frameall: "frameall",
  view: "view",
  camera: "camera",
  pivot: "pivot",
  orbit: "orbit",
  pan: "pan",
  zoom: "zoom",
  filter: "selectionfilter",
  select: "selectionfilter",
  selection: "selectionfilter",
  "selection-filter": "selectionfilter",
  snap: "snapping",
  snaps: "snapping",
  grid: "grid",
  cplane: "cplane",
  "c-plane": "cplane",
  display: "display",
  isolate: "isolate",
  outliner: "outliner",
  tolerance: "tolerance",
  precision: "tolerance",
  status: "status",
  mesh: "meshconvert",
  meshconvert: "meshconvert",
  "mesh-convert": "meshconvert",
  tomesh: "meshconvert",
  "to-mesh": "meshconvert",
  nurbs: "nurbsrestore",
  nurbsrestore: "nurbsrestore",
  "nurbs-restore": "nurbsrestore",
  tonurbs: "nurbsrestore",
  "to-nurbs": "nurbsrestore",
  unmesh: "nurbsrestore",
};

const COMMAND_ALIASES: Record<string, string> = {
  ...BASE_COMMAND_ALIASES,
  ...Object.fromEntries(PRIMITIVE_COMMAND_ALIAS_ENTRIES),
};

export const resolveCommandToken = (token: string) => {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return null;
  const aliased = COMMAND_ALIASES[normalized] ?? normalized;
  return (
    COMMAND_DEFINITIONS.find((command) => command.id === aliased) ??
    COMMAND_DEFINITIONS.find(
      (command) => command.label.toLowerCase() === aliased
    ) ??
    null
  );
};

export const resolveCommand = (input: string) => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  const withoutPrefix = normalized.replace(COMMAND_PREFIX, "");
  return resolveCommandToken(withoutPrefix);
};

export const parseCommandInput = (input: string) => {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();
  if (!normalized) {
    return { command: null, args: "" };
  }
  const withoutPrefix = normalized.replace(COMMAND_PREFIX, "");
  const [token, ...rest] = withoutPrefix.split(/\s+/);
  let command = resolveCommandToken(token);
  let args = rest.join(" ");

  if (!command) {
    const labelMatch = COMMAND_DEFINITIONS.map((definition) => ({
      definition,
      label: definition.label.toLowerCase(),
    }))
      .filter((entry) => withoutPrefix.startsWith(entry.label))
      .sort((a, b) => b.label.length - a.label.length)[0];
    if (labelMatch) {
      command = labelMatch.definition;
      args = withoutPrefix.slice(labelMatch.label.length).trim();
    }
  }

  return { command, args, raw: trimmed };
};
