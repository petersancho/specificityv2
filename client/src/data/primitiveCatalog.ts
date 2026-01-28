import type { PrimitiveKind } from "../types";

export type PrimitiveCatalogEntry = {
  id: string;
  label: string;
  kind: PrimitiveKind;
  aliases?: string[];
};

export const PRIMITIVE_CATALOG: PrimitiveCatalogEntry[] = [
  { id: "box", label: "Box", kind: "box", aliases: ["cube", "bx"] },
  { id: "sphere", label: "Sphere", kind: "sphere", aliases: ["sph"] },
  { id: "cylinder", label: "Cylinder", kind: "cylinder", aliases: ["cyl"] },
  { id: "torus", label: "Torus", kind: "torus", aliases: ["toroid"] },
  { id: "pyramid", label: "Pyramid", kind: "pyramid", aliases: ["pyr"] },
  { id: "tetrahedron", label: "Tetrahedron", kind: "tetrahedron", aliases: ["tetra"] },
  { id: "octahedron", label: "Octahedron", kind: "octahedron", aliases: ["octa"] },
  { id: "icosahedron", label: "Icosahedron", kind: "icosahedron", aliases: ["icosa"] },
  { id: "dodecahedron", label: "Dodecahedron", kind: "dodecahedron", aliases: ["dodeca"] },
  { id: "hemisphere", label: "Hemisphere", kind: "hemisphere", aliases: ["hemi"] },
  { id: "capsule", label: "Capsule", kind: "capsule", aliases: ["pill"] },
  { id: "disk", label: "Disk", kind: "disk", aliases: ["disc"] },
  { id: "ring", label: "Ring / Annulus", kind: "ring", aliases: ["annulus"] },
  {
    id: "triangular-prism",
    label: "Triangular Prism",
    kind: "triangularPrism",
    aliases: ["triangular", "triangularprism", "prism"],
  },
  {
    id: "hexagonal-prism",
    label: "Hexagonal Prism",
    kind: "hexagonalPrism",
    aliases: ["hexagonal", "hexagonalprism"],
  },
  {
    id: "pentagonal-prism",
    label: "Pentagonal Prism",
    kind: "pentagonalPrism",
    aliases: ["pentagonal", "pentagonalprism"],
  },
  {
    id: "torus-knot",
    label: "Torus Knot",
    kind: "torusKnot",
    aliases: ["torusknot", "knot"],
  },
  {
    id: "utah-teapot",
    label: "Utah Teapot",
    kind: "utahTeapot",
    aliases: ["utah", "teapot"],
  },
  { id: "frustum", label: "Frustum", kind: "frustum" },
  {
    id: "mobius-strip",
    label: "Mobius Strip",
    kind: "mobiusStrip",
    aliases: ["mobius", "moebius", "mobiusstrip"],
  },
  { id: "ellipsoid", label: "Ellipsoid", kind: "ellipsoid" },
  { id: "wedge", label: "Wedge", kind: "wedge" },
  {
    id: "spherical-cap",
    label: "Spherical Cap / Dome",
    kind: "sphericalCap",
    aliases: ["sphericalcap", "dome"],
  },
  { id: "bipyramid", label: "Bipyramid", kind: "bipyramid", aliases: ["bi-pyramid"] },
  {
    id: "rhombic-dodecahedron",
    label: "Rhombic Dodecahedron",
    kind: "rhombicDodecahedron",
    aliases: ["rhombic"],
  },
  {
    id: "truncated-cube",
    label: "Truncated Cube",
    kind: "truncatedCube",
    aliases: ["truncatedcube"],
  },
  {
    id: "truncated-octahedron",
    label: "Truncated Octahedron",
    kind: "truncatedOctahedron",
    aliases: ["truncatedoctahedron"],
  },
  {
    id: "truncated-icosahedron",
    label: "Truncated Icosahedron",
    kind: "truncatedIcosahedron",
    aliases: ["truncatedicosahedron", "truncated", "soccer", "bucky"],
  },
  {
    id: "pipe",
    label: "Pipe / Hollow Cylinder",
    kind: "pipe",
    aliases: ["hollowcylinder", "hollow-cylinder"],
  },
  {
    id: "superellipsoid",
    label: "Superellipsoid",
    kind: "superellipsoid",
    aliases: ["super-ellipsoid"],
  },
  {
    id: "hyperbolic-paraboloid",
    label: "Hyperbolic Paraboloid",
    kind: "hyperbolicParaboloid",
    aliases: ["hyperbolic", "saddle"],
  },
  {
    id: "geodesic-dome",
    label: "Geodesic Dome",
    kind: "geodesicDome",
    aliases: ["geodesic"],
  },
  {
    id: "one-sheet-hyperboloid",
    label: "One-Sheet Hyperboloid",
    kind: "oneSheetHyperboloid",
    aliases: ["one-sheet", "hyperboloid"],
  },
];

export const PRIMITIVE_COMMAND_IDS = PRIMITIVE_CATALOG.map((entry) => entry.id);

export const PRIMITIVE_COMMAND_ALIAS_ENTRIES = PRIMITIVE_CATALOG.flatMap((entry) =>
  (entry.aliases ?? []).map((alias) => [alias, entry.id] as const)
);

export const PRIMITIVE_KIND_BY_COMMAND = new Map(
  PRIMITIVE_CATALOG.map((entry) => [entry.id, entry.kind] as const)
);

export const PRIMITIVE_NODE_CATALOG = PRIMITIVE_CATALOG.filter(
  (entry) => entry.id !== "box" && entry.id !== "sphere"
);

export const PRIMITIVE_NODE_TYPE_IDS = PRIMITIVE_NODE_CATALOG.map((entry) => entry.id);

export const PRIMITIVE_NODE_KIND_BY_TYPE = new Map(
  PRIMITIVE_NODE_CATALOG.map((entry) => [entry.id, entry.kind] as const)
);
