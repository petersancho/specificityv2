export type CommandCategory = "geometry" | "performs";

export type CommandDefinition = {
  id: string;
  label: string;
  category: CommandCategory;
  prompt: string;
};

export const COMMAND_PREFIX = /^(geometry|perform|performs)\s*[:\-]?\s*/;

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    id: "point",
    label: "Point",
    category: "geometry",
    prompt:
      "Point: click to place points or type x,y,z. Snaps to grid/verts/midpoints.",
  },
  {
    id: "line",
    label: "Line",
    category: "geometry",
    prompt:
      "Line: click start and end points. Enter commits from cursor, Esc cancels.",
  },
  {
    id: "polyline",
    label: "Polyline",
    category: "geometry",
    prompt:
      "Polyline: click to add points, press Enter to finish, Esc to cancel. Use close/open to toggle.",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    category: "geometry",
    prompt:
      "Rectangle: click to place a closed polyline. Use width=.. height=.. to size.",
  },
  {
    id: "circle",
    label: "Circle",
    category: "geometry",
    prompt:
      "Circle: click to place a closed polyline. Use radius=.. segments=.. to size.",
  },
  {
    id: "arc",
    label: "Arc",
    category: "geometry",
    prompt:
      "Arc: click start, end, then a point on the arc. Enter commits from cursor.",
  },
  {
    id: "curve",
    label: "Curve",
    category: "geometry",
    prompt:
      "Curve: click points for a smooth curve. Enter commits, Esc cancels.",
  },
  {
    id: "interpolate",
    label: "Interpolate",
    category: "performs",
    prompt: "Interpolate: degree=1-3 for selected poly-lines.",
  },
  {
    id: "primitive",
    label: "Primitive",
    category: "geometry",
    prompt:
      "Primitive: choose a base point to place geometry. Types: box, sphere, cylinder, torus.",
  },
  {
    id: "box",
    label: "Box",
    category: "geometry",
    prompt: "Box: place a box primitive on the construction plane.",
  },
  {
    id: "sphere",
    label: "Sphere",
    category: "geometry",
    prompt: "Sphere: place a sphere primitive on the construction plane.",
  },
  {
    id: "cylinder",
    label: "Cylinder",
    category: "geometry",
    prompt: "Cylinder: place a cylinder primitive on the construction plane.",
  },
  {
    id: "boolean",
    label: "Boolean",
    category: "performs",
    prompt: "Boolean: select source geometry to combine.",
  },
  {
    id: "loft",
    label: "Loft",
    category: "performs",
    prompt: "Loft: degree=1-3, closed/open. Press Enter to commit, Esc to cancel.",
  },
  {
    id: "surface",
    label: "Surface",
    category: "performs",
    prompt:
      "Surface: plane=auto|world|cplane, epsilon=.. Press Enter to commit, Esc to cancel.",
  },
  {
    id: "extrude",
    label: "Extrude",
    category: "performs",
    prompt:
      "Extrude: distance=.. axis=x|y|z cplane vector=.. Press Enter to commit, Esc to cancel.",
  },
  {
    id: "transform",
    label: "Transform",
    category: "performs",
    prompt: "Transform: drag handles or type values. Press Enter to commit, Esc to cancel.",
  },
  {
    id: "move",
    label: "Move",
    category: "performs",
    prompt: "Move: drag or type x,y,z. axis=x|y|z, plane=xy|yz|xz. Enter to commit.",
  },
  {
    id: "rotate",
    label: "Rotate",
    category: "performs",
    prompt: "Rotate: drag or type angle=deg. axis=x|y|z, snap=deg. Enter to commit.",
  },
  {
    id: "scale",
    label: "Scale",
    category: "performs",
    prompt: "Scale: drag or type uniform=.. or x=.. y=.. z=.. Enter to commit.",
  },
  {
    id: "offset",
    label: "Offset",
    category: "performs",
    prompt:
      "Offset: distance=.. offsets selected polylines on the construction plane.",
  },
  {
    id: "mirror",
    label: "Mirror",
    category: "performs",
    prompt: "Mirror: axis=x|y|z mirrors the selection across a pivot plane.",
  },
  {
    id: "array",
    label: "Array",
    category: "performs",
    prompt: "Array: count=.. spacing=.. axis=x|y|z duplicates the selection.",
  },
  {
    id: "gumball",
    label: "Gumball",
    category: "performs",
    prompt: "Gumball: drag handles to move/rotate/scale. Use Extrude on profiles.",
  },
  {
    id: "undo",
    label: "Undo",
    category: "performs",
    prompt: "Undo: ctrl+z to undo modeler action.",
  },
  {
    id: "redo",
    label: "Redo",
    category: "performs",
    prompt: "Redo: ctrl+shift+z or ctrl+y.",
  },
  {
    id: "copy",
    label: "Copy",
    category: "performs",
    prompt: "Copy: ctrl+c copies selected geometry.",
  },
  {
    id: "paste",
    label: "Paste",
    category: "performs",
    prompt: "Paste: ctrl+v. Options: inplace | cursor | origin.",
  },
  {
    id: "duplicate",
    label: "Duplicate",
    category: "performs",
    prompt: "Duplicate: ctrl+d or alt-drag to copy.",
  },
  {
    id: "delete",
    label: "Delete",
    category: "performs",
    prompt: "Delete: del/backspace removes selection.",
  },
  {
    id: "cancel",
    label: "Cancel",
    category: "performs",
    prompt: "Cancel: Esc to cancel current command.",
  },
  {
    id: "confirm",
    label: "Confirm",
    category: "performs",
    prompt: "Confirm: Enter or right-click to commit.",
  },
  {
    id: "focus",
    label: "Focus",
    category: "performs",
    prompt: "Focus: frame selection.",
  },
  {
    id: "frameall",
    label: "Frame All",
    category: "performs",
    prompt: "Frame All: frame entire model.",
  },
  {
    id: "view",
    label: "View",
    category: "performs",
    prompt: "View: top/front/right/perspective toggle.",
  },
  {
    id: "camera",
    label: "Camera",
    category: "performs",
    prompt: "Camera: presets blender|maya, custom.",
  },
  {
    id: "pivot",
    label: "Pivot",
    category: "performs",
    prompt: "Pivot: world|selection|picked|cursor|origin.",
  },
  {
    id: "orbit",
    label: "Orbit",
    category: "performs",
    prompt: "Orbit: toggle orbit mode.",
  },
  {
    id: "pan",
    label: "Pan",
    category: "performs",
    prompt: "Pan: toggle pan mode.",
  },
  {
    id: "zoom",
    label: "Zoom",
    category: "performs",
    prompt: "Zoom: toggle zoom mode.",
  },
  {
    id: "selectionfilter",
    label: "Selection Filter",
    category: "performs",
    prompt: "Selection Filter: object|vertex|edge|face.",
  },
  {
    id: "cycle",
    label: "Cycle Selection",
    category: "performs",
    prompt: "Cycle: tab to cycle overlapping selection.",
  },
  {
    id: "snapping",
    label: "Snapping",
    category: "performs",
    prompt: "Snapping: grid/vertex/endpoint/midpoint/intersection.",
  },
  {
    id: "grid",
    label: "Grid",
    category: "performs",
    prompt: "Grid: spacing=.. units=.. adaptive on/off.",
  },
  {
    id: "cplane",
    label: "C-Plane",
    category: "performs",
    prompt: "C-Plane: world xy/xz/yz, selection, 3point.",
  },
  {
    id: "display",
    label: "Display",
    category: "performs",
    prompt: "Display: wireframe|shaded|edges|ghosted.",
  },
  {
    id: "isolate",
    label: "Isolate",
    category: "performs",
    prompt: "Isolate: hide/lock selection; show all.",
  },
  {
    id: "outliner",
    label: "Outliner",
    category: "performs",
    prompt: "Outliner: group/ungroup, layers, visibility.",
  },
  {
    id: "tolerance",
    label: "Tolerance",
    category: "performs",
    prompt: "Tolerance: set absolute/angle tolerance.",
  },
  {
    id: "status",
    label: "Status",
    category: "performs",
    prompt: "Status: toggle command help/status bar.",
  },
  {
    id: "morph",
    label: "Morph",
    category: "performs",
    prompt: "Morph: select geometry to sculpt.",
  },
];

const COMMAND_ALIASES: Record<string, string> = {
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
  primitive: "primitive",
  prim: "primitive",
  bx: "box",
  box: "box",
  cube: "box",
  sph: "sphere",
  sphere: "sphere",
  cyl: "cylinder",
  cylinder: "cylinder",
  torus: "primitive",
  toroid: "primitive",
  ext: "extrude",
  ex: "extrude",
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
  "frameall": "frameall",
  view: "view",
  camera: "camera",
  pivot: "pivot",
  orbit: "orbit",
  pan: "pan",
  zoom: "zoom",
  filter: "selectionfilter",
  select: "selectionfilter",
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
  const command = resolveCommandToken(token);
  return { command, args: rest.join(" "), raw: trimmed };
};
