export const COMMAND_DESCRIPTIONS: Record<
  string,
  { description: string; shortcut?: string; category: string }
> = {
  point: {
    description: "Place a point vertex in 3D space. Click to position.",
    shortcut: "V",
    category: "geometry",
  },
  polyline: {
    description: "Draw connected line segments. Click points, Enter to finish.",
    shortcut: "P",
    category: "geometry",
  },
  rectangle: {
    description: "Create a rectangular closed curve from two corner points.",
    shortcut: "R",
    category: "geometry",
  },
  circle: {
    description: "Draw a circle. Click center, drag for radius.",
    shortcut: "C",
    category: "geometry",
  },
  primitive: {
    description: "Create 3D primitives: Box, Sphere, Cylinder, Torus.",
    shortcut: "B",
    category: "geometry",
  },
  interpolate: {
    description: "Create a smooth NURBS curve through control points.",
    shortcut: "I",
    category: "geometry",
  },
  surface: {
    description: "Create a planar surface from a closed boundary curve.",
    shortcut: "S",
    category: "geometry",
  },
  loft: {
    description: "Generate a surface between two or more profile curves.",
    shortcut: "L",
    category: "geometry",
  },
  extrude: {
    description: "Extrude a profile curve into a 3D solid. Set distance in options.",
    shortcut: "E",
    category: "geometry",
  },
  move: {
    description: "Translate selected geometry. Drag or enter coordinates.",
    shortcut: "G",
    category: "transform",
  },
  rotate: {
    description: "Rotate selection around an axis. Click center, set angle.",
    shortcut: "⌘R",
    category: "transform",
  },
  scale: {
    description: "Scale geometry uniformly or per-axis from a reference point.",
    shortcut: "⌘S",
    category: "transform",
  },
  gumball: {
    description: "Interactive transform widget for move/rotate/scale.",
    shortcut: "W",
    category: "transform",
  },
  undo: {
    description: "Revert the last action.",
    shortcut: "⌘Z",
    category: "edit",
  },
  redo: {
    description: "Reapply the last undone action.",
    shortcut: "⌘⇧Z",
    category: "edit",
  },
  copy: {
    description: "Copy selected geometry to clipboard.",
    shortcut: "⌘C",
    category: "edit",
  },
  paste: {
    description: "Paste geometry from clipboard at cursor position.",
    shortcut: "⌘V",
    category: "edit",
  },
  duplicate: {
    description: "Create a duplicate of selected geometry in place.",
    shortcut: "⌘D",
    category: "edit",
  },
  delete: {
    description: "Remove selected geometry from the scene.",
    shortcut: "⌫",
    category: "edit",
  },
  focus: {
    description: "Center view on selected geometry.",
    shortcut: "F",
    category: "view",
  },
  frameall: {
    description: "Fit all geometry in the viewport.",
    shortcut: "⇧F",
    category: "view",
  },
};
