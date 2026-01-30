# Command + Node Test Matrix

Updated: 2026-01-30

Use this checklist to validate every Roslyn command and Numerica node.
Pair this document with `docs/commands_nodes_reference.md` and `docs/numerica_nodes_reference.md`.

## Global Test Protocol

- Validate command/node exists in the palette and by text search.
- Verify primary interaction (click/drag/type) produces expected output.
- Confirm cancel behavior (`Esc`) leaves state unchanged.
- Confirm undo/redo restores prior state.
- Check invalid input paths (empty selection, wrong type) return clear feedback.
- Save/reload project and confirm state persists.

## Update Protocol

- Regenerate this checklist when `commands_nodes_reference.md` or `numerica_nodes_reference.md` changes.
- Keep the `Updated:` stamp current to match the source lists.

## Roslyn Commands

### Primitive
- [ ] Bipyramid (`bipyramid`) — Notes:
- [ ] Box (`box`) — Notes:
- [ ] Capsule (`capsule`) — Notes:
- [ ] Cylinder (`cylinder`) — Notes:
- [ ] Disk (`disk`) — Notes:
- [ ] Dodecahedron (`dodecahedron`) — Notes:
- [ ] Ellipsoid (`ellipsoid`) — Notes:
- [ ] Frustum (`frustum`) — Notes:
- [ ] Geodesic Dome (`geodesic-dome`) — Notes:
- [ ] Hemisphere (`hemisphere`) — Notes:
- [ ] Hexagonal Prism (`hexagonal-prism`) — Notes:
- [ ] Hyperbolic Paraboloid (`hyperbolic-paraboloid`) — Notes:
- [ ] Icosahedron (`icosahedron`) — Notes:
- [ ] Mobius Strip (`mobius-strip`) — Notes:
- [ ] Octahedron (`octahedron`) — Notes:
- [ ] One-Sheet Hyperboloid (`one-sheet-hyperboloid`) — Notes:
- [ ] Pentagonal Prism (`pentagonal-prism`) — Notes:
- [ ] Pipe / Hollow Cylinder (`pipe`) — Notes:
- [ ] Point (`point`) — Notes:
- [ ] Pyramid (`pyramid`) — Notes:
- [ ] Rhombic Dodecahedron (`rhombic-dodecahedron`) — Notes:
- [ ] Ring / Annulus (`ring`) — Notes:
- [ ] Sphere (`sphere`) — Notes:
- [ ] Spherical Cap / Dome (`spherical-cap`) — Notes:
- [ ] Superellipsoid (`superellipsoid`) — Notes:
- [ ] Tetrahedron (`tetrahedron`) — Notes:
- [ ] Torus (`torus`) — Notes:
- [ ] Torus Knot (`torus-knot`) — Notes:
- [ ] Triangular Prism (`triangular-prism`) — Notes:
- [ ] Truncated Cube (`truncated-cube`) — Notes:
- [ ] Truncated Icosahedron (`truncated-icosahedron`) — Notes:
- [ ] Truncated Octahedron (`truncated-octahedron`) — Notes:
- [ ] Utah Teapot (`utah-teapot`) — Notes:
- [ ] Wedge (`wedge`) — Notes:

### Curve
- [ ] Line (`line`) — Notes:
- [ ] Polyline (`polyline`) — Notes:
- [ ] Rectangle (`rectangle`) — Notes:

### NURBS
- [ ] Arc (`arc`) — Notes:
- [ ] Circle (`circle`) — Notes:
- [ ] Curve (`curve`) — Notes:
- [ ] Interpolate (`interpolate`) — Notes:

### Mesh
- [ ] Boolean (`boolean`) — Notes:
- [ ] Extrude (`extrude`) — Notes:
- [ ] Loft (`loft`) — Notes:
- [ ] Mesh Flip (`meshflip`) — Notes:
- [ ] Mesh Merge (`meshmerge`) — Notes:
- [ ] Mesh Thicken (`meshthicken`) — Notes:
- [ ] Mesh to NURBS (`nurbsrestore`) — Notes:
- [ ] NURBS to Mesh (`meshconvert`) — Notes:
- [ ] Surface (`surface`) — Notes:

### Transform
- [ ] Array (`array`) — Notes:
- [ ] Mirror (`mirror`) — Notes:
- [ ] Morph (`morph`) — Notes:
- [ ] Move (`move`) — Notes:
- [ ] Offset (`offset`) — Notes:
- [ ] Rotate (`rotate`) — Notes:
- [ ] Scale (`scale`) — Notes:
- [ ] Transform (`transform`) — Notes:

### Gumball
- [ ] Gumball (`gumball`) — Notes:

### Pivot
- [ ] Pivot (`pivot`) — Notes:

### C-Plane
- [ ] C-Plane (`cplane`) — Notes:

### Selection
- [ ] Cycle Selection (`cycle`) — Notes:
- [ ] Grid (`grid`) — Notes:
- [ ] Selection Filter (`selectionfilter`) — Notes:
- [ ] Snapping (`snapping`) — Notes:
- [ ] Tolerance (`tolerance`) — Notes:

### Camera
- [ ] Camera (`camera`) — Notes:
- [ ] Orbit (`orbit`) — Notes:
- [ ] Pan (`pan`) — Notes:
- [ ] Zoom (`zoom`) — Notes:

### View
- [ ] Display (`display`) — Notes:
- [ ] Focus (`focus`) — Notes:
- [ ] Frame All (`frameall`) — Notes:
- [ ] Isolate (`isolate`) — Notes:
- [ ] Status (`status`) — Notes:
- [ ] View (`view`) — Notes:

### Workflow
- [ ] Outliner (`outliner`) — Notes:

### Edit
- [ ] Cancel (`cancel`) — Notes:
- [ ] Confirm (`confirm`) — Notes:
- [ ] Copy (`copy`) — Notes:
- [ ] Delete (`delete`) — Notes:
- [ ] Duplicate (`duplicate`) — Notes:
- [ ] Paste (`paste`) — Notes:
- [ ] Redo (`redo`) — Notes:
- [ ] Undo (`undo`) — Notes:

## Numerica Nodes
