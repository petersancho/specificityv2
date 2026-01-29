import { PRIMITIVE_CATALOG } from "./primitiveCatalog";

const PRIMITIVE_COMMAND_DESCRIPTIONS = Object.fromEntries(
  PRIMITIVE_CATALOG.map((entry) => [
    entry.id,
    {
      description: `Click to set the base on the C-Plane, then click to set the size of the ${entry.label}.`,
      category: "geometry",
    },
  ])
);

export const COMMAND_DESCRIPTIONS: Record<
  string,
  { description: string; shortcut?: string; category: string }
> = {
  point: {
    description: "Click to place a point.",
    shortcut: "V",
    category: "geometry",
  },
  line: {
    description: "Click start and end points; double-click to finish.",
    category: "geometry",
  },
  polyline: {
    description: "Click points to draw. Right-click or double-click to finish.",
    shortcut: "P",
    category: "geometry",
  },
  rectangle: {
    description: "Click first corner, then click the opposite corner.",
    shortcut: "R",
    category: "geometry",
  },
  circle: {
    description: "Click the center, then click the radius.",
    shortcut: "C",
    category: "geometry",
  },
  arc: {
    description: "Click start, click end, then click a point on the arc.",
    category: "geometry",
  },
  curve: {
    description: "Click points to shape the curve. Right-click or double-click to finish.",
    category: "geometry",
  },
  ...PRIMITIVE_COMMAND_DESCRIPTIONS,
  interpolate: {
    description: "Select polylines, then click Run or press Enter to convert.",
    shortcut: "I",
    category: "geometry",
  },
  surface: {
    description: "Select a closed curve, then click Run or press Enter.",
    shortcut: "S",
    category: "geometry",
  },
  loft: {
    description: "Select two or more curves, then click Run or press Enter.",
    shortcut: "L",
    category: "geometry",
  },
  extrude: {
    description: "Select a profile, then drag to set distance or enter a value.",
    shortcut: "E",
    category: "geometry",
  },
  move: {
    description: "Drag a gumball handle or enter XYZ values.",
    shortcut: "G",
    category: "transform",
  },
  rotate: {
    description: "Drag a rotation ring or enter an angle.",
    shortcut: "⌘R",
    category: "transform",
  },
  scale: {
    description: "Drag a scale handle or enter values.",
    shortcut: "⌘S",
    category: "transform",
  },
  offset: {
    description: "Select curves, then click to set distance.",
    category: "transform",
  },
  mirror: {
    description: "Select geometry, then click to define the mirror line or plane.",
    category: "transform",
  },
  array: {
    description: "Select geometry, then set direction, spacing, and count.",
    category: "transform",
  },
  gumball: {
    description: "Click handles to move, rotate, or scale.",
    shortcut: "W",
    category: "transform",
  },
  undo: {
    description: "Click to undo the last action.",
    shortcut: "⌘Z",
    category: "edit",
  },
  redo: {
    description: "Click to redo the last undone action.",
    shortcut: "⌘⇧Z",
    category: "edit",
  },
  copy: {
    description: "Click to copy the selected geometry.",
    shortcut: "⌘C",
    category: "edit",
  },
  paste: {
    description: "Click to paste geometry from the clipboard.",
    shortcut: "⌘V",
    category: "edit",
  },
  duplicate: {
    description: "Click to duplicate the current selection.",
    shortcut: "⌘D",
    category: "edit",
  },
  delete: {
    description: "Click to delete the selected geometry.",
    shortcut: "⌫",
    category: "edit",
  },
  focus: {
    description: "Click to frame the current selection.",
    shortcut: "F",
    category: "view",
  },
  frameall: {
    description: "Click to frame all visible geometry.",
    shortcut: "⇧F",
    category: "view",
  },
};
