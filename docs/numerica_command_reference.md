# Numerica Command Reference

Updated: 2026-01-30

This reference is generated from the command registry and command descriptions.

## Command Semantics

- **geometry**: Creates or converts geometry directly in Roslyn using the active construction plane and cursor input.
- **transform**: Repositions geometry by applying spatial transforms. Outputs stay linked to selection state and gumball input.
- **edit**: Edits selection, clipboard, or history state without generating new geometry.
- **view**: Changes the camera frame, projection, or viewport focus for spatial clarity.
- **performs**: Runs a modeling action on the current selection, emphasizing procedural intent over manual edits.

## Geometry

### Point (`point`)

- Where: Command palette / toolbar
- Shortcut: V
- Description: Click to place a point on the active C-Plane. Use snaps for precision; Esc cancels.

Steps:
- Point: click to place a point. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Box (`box`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Box. Esc cancels.

Steps:
- Box: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Sphere (`sphere`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Sphere. Esc cancels.

Steps:
- Sphere: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Cylinder (`cylinder`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Cylinder. Esc cancels.

Steps:
- Cylinder: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Torus (`torus`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Torus. Esc cancels.

Steps:
- Torus: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Pyramid (`pyramid`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Pyramid. Esc cancels.

Steps:
- Pyramid: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Tetrahedron (`tetrahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Tetrahedron. Esc cancels.

Steps:
- Tetrahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Octahedron (`octahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Octahedron. Esc cancels.

Steps:
- Octahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Icosahedron (`icosahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Icosahedron. Esc cancels.

Steps:
- Icosahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Dodecahedron (`dodecahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Dodecahedron. Esc cancels.

Steps:
- Dodecahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Hemisphere (`hemisphere`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Hemisphere. Esc cancels.

Steps:
- Hemisphere: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Capsule (`capsule`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Capsule. Esc cancels.

Steps:
- Capsule: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Disk (`disk`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Disk. Esc cancels.

Steps:
- Disk: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Ring / Annulus (`ring`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Ring / Annulus. Esc cancels.

Steps:
- Ring / Annulus: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Triangular Prism (`triangular-prism`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Triangular Prism. Esc cancels.

Steps:
- Triangular Prism: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Hexagonal Prism (`hexagonal-prism`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Hexagonal Prism. Esc cancels.

Steps:
- Hexagonal Prism: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Pentagonal Prism (`pentagonal-prism`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Pentagonal Prism. Esc cancels.

Steps:
- Pentagonal Prism: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Torus Knot (`torus-knot`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Torus Knot. Esc cancels.

Steps:
- Torus Knot: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Utah Teapot (`utah-teapot`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Utah Teapot. Esc cancels.

Steps:
- Utah Teapot: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Frustum (`frustum`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Frustum. Esc cancels.

Steps:
- Frustum: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mobius Strip (`mobius-strip`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Mobius Strip. Esc cancels.

Steps:
- Mobius Strip: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Ellipsoid (`ellipsoid`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Ellipsoid. Esc cancels.

Steps:
- Ellipsoid: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Wedge (`wedge`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Wedge. Esc cancels.

Steps:
- Wedge: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Spherical Cap / Dome (`spherical-cap`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Spherical Cap / Dome. Esc cancels.

Steps:
- Spherical Cap / Dome: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Bipyramid (`bipyramid`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Bipyramid. Esc cancels.

Steps:
- Bipyramid: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Rhombic Dodecahedron (`rhombic-dodecahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Rhombic Dodecahedron. Esc cancels.

Steps:
- Rhombic Dodecahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Truncated Cube (`truncated-cube`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Truncated Cube. Esc cancels.

Steps:
- Truncated Cube: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Truncated Octahedron (`truncated-octahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Truncated Octahedron. Esc cancels.

Steps:
- Truncated Octahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Truncated Icosahedron (`truncated-icosahedron`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Truncated Icosahedron. Esc cancels.

Steps:
- Truncated Icosahedron: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Pipe / Hollow Cylinder (`pipe`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Pipe / Hollow Cylinder. Esc cancels.

Steps:
- Pipe / Hollow Cylinder: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Superellipsoid (`superellipsoid`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Superellipsoid. Esc cancels.

Steps:
- Superellipsoid: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Hyperbolic Paraboloid (`hyperbolic-paraboloid`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Hyperbolic Paraboloid. Esc cancels.

Steps:
- Hyperbolic Paraboloid: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Geodesic Dome (`geodesic-dome`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the Geodesic Dome. Esc cancels.

Steps:
- Geodesic Dome: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### One-Sheet Hyperboloid (`one-sheet-hyperboloid`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then click to confirm the One-Sheet Hyperboloid. Esc cancels.

Steps:
- One-Sheet Hyperboloid: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Line (`line`)

- Where: Command palette / toolbar
- Description: Click start and end points, then keep clicking to chain segments. Double-click or Enter to finish; Esc cancels.

Steps:
- Line: click start, click end to place a segment. Double-click to finish. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Polyline (`polyline`)

- Where: Command palette / toolbar
- Shortcut: P
- Description: Click to add vertices; right-click, Enter, or double-click to finish. Esc cancels.

Steps:
- Polyline: click points to draw. Right-click or double-click to finish. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Rectangle (`rectangle`)

- Where: Command palette / toolbar
- Shortcut: R
- Description: Click the first corner, then the opposite corner. Type width,height for an exact size.

Steps:
- Rectangle: click first corner, click opposite corner to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Circle (`circle`)

- Where: Command palette / toolbar
- Shortcut: C
- Description: Click the center, then the radius. Type a value to set exact size.

Steps:
- Circle: click center, click radius to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Arc (`arc`)

- Where: Command palette / toolbar
- Description: Click start, click end, then click a bulge point to set curvature. Enter to finish.

Steps:
- Arc: click start, click end, click a point on the arc. Double-click to finish. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Curve (`curve`)

- Where: Command palette / toolbar
- Description: Click control points to shape the curve. Right-click or double-click to finish.

Steps:
- Curve: click points to shape the curve. Right-click or double-click to finish. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### NURBS Box (`nurbsbox`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then confirm. Esc cancels.

Steps:
- NURBS Box: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### NURBS Sphere (`nurbssphere`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then confirm. Esc cancels.

Steps:
- NURBS Sphere: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### NURBS Cylinder (`nurbscylinder`)

- Where: Command palette / toolbar
- Description: Click to place the base on the C-Plane, drag or type a size, then confirm. Esc cancels.

Steps:
- NURBS Cylinder: click to set base on the C-Plane, move to size, click to place. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

## Performs

### NURBS to Mesh (`meshconvert`)

- Where: Command palette / toolbar
- Description: Triangulate NURBS curves or surfaces into editable meshes for rendering and mesh edits.

Steps:
- NURBS to Mesh: select NURBS curves or surfaces, then click Run or press Enter.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### B-Rep to Mesh (`breptomesh`)

- Where: Command palette / toolbar
- Description: Tessellate B-Rep solids into renderable meshes for downstream mesh editing.

Steps:
- B-Rep to Mesh: select B-Rep solids, then click Run or press Enter.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mesh to B-Rep (`meshtobrep`)

- Where: Command palette / toolbar
- Description: Convert meshes into triangle-based B-Rep solids for topology-aware workflows.

Steps:
- Mesh to B-Rep: select meshes, then click Run or press Enter.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mesh to NURBS (`nurbsrestore`)

- Where: Command palette / toolbar
- Description: Attempt to rebuild NURBS curves or surfaces from converted meshes. Best for recent conversions.

Steps:
- Mesh to NURBS: select a mesh converted from NURBS, then click Run or press Enter.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Interpolate (`interpolate`)

- Where: Command palette / toolbar
- Shortcut: I
- Description: Convert polylines into smooth NURBS by interpolating through vertices. Select curves, then Run.

Steps:
- Interpolate: select polylines, then click Run or press Enter to convert.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Boolean (`boolean`)

- Where: Command palette / toolbar
- Description: Boolean: select solids, then click Run to combine. Esc cancels.

Steps:
- Boolean: select solids, then click Run to combine. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Loft (`loft`)

- Where: Command palette / toolbar
- Shortcut: L
- Description: Loft between two or more curves; order matters. Select profiles in sequence, then Run.

Steps:
- Loft: select two or more curves, then click Run or press Enter. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Surface (`surface`)

- Where: Command palette / toolbar
- Shortcut: S
- Description: Create a planar surface from a closed curve or polyline. Select the boundary, then Run.

Steps:
- Surface: select a closed curve, then click Run or press Enter. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Extrude (`extrude`)

- Where: Command palette / toolbar
- Shortcut: E
- Description: Extrude a profile or surface along the C-Plane normal. Drag to set distance or type a value.

Steps:
- Extrude: select a profile, then drag to set distance or enter a value.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mesh Merge (`meshmerge`)

- Where: Command palette / toolbar
- Description: Combine selected meshes into a single mesh object.

Steps:
- Mesh Merge: select meshes, then click Run or press Enter to combine.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mesh Flip (`meshflip`)

- Where: Command palette / toolbar
- Description: Flip mesh normals and triangle winding to fix inside-out faces.

Steps:
- Mesh Flip: select meshes, then click Run or press Enter to flip normals.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mesh Thicken (`meshthicken`)

- Where: Command palette / toolbar
- Description: Offset mesh along normals and cap edges to add thickness.

Steps:
- Mesh Thicken: select meshes, set thickness/sides, then click Run or press Enter.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Transform (`transform`)

- Where: Command palette / toolbar
- Description: Transform: select geometry, drag gumball handles or enter values.

Steps:
- Transform: select geometry, drag gumball handles or enter values.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Move (`move`)

- Where: Command palette / toolbar
- Shortcut: G
- Description: Drag gumball axes or type XYZ to translate the selection precisely.

Steps:
- Move: select geometry, drag a gumball handle or enter XYZ values.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Rotate (`rotate`)

- Where: Command palette / toolbar
- Shortcut: ⌘R
- Description: Drag a rotation ring or type an angle. Uses the current pivot.

Steps:
- Rotate: select geometry, drag a rotation ring or enter an angle.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Scale (`scale`)

- Where: Command palette / toolbar
- Shortcut: ⌘S
- Description: Drag scale handles or type factors. Hold Shift for uniform scale around the pivot.

Steps:
- Scale: select geometry, drag a scale handle or enter values.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Offset (`offset`)

- Where: Command palette / toolbar
- Description: Offset selected curves by a distance; positive/negative controls direction.

Steps:
- Offset: select curves, then click to set distance.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Mirror (`mirror`)

- Where: Command palette / toolbar
- Description: Mirror selected geometry across a line or plane you define.

Steps:
- Mirror: select geometry, then click to define the mirror line or plane.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Array (`array`)

- Where: Command palette / toolbar
- Description: Duplicate selection along a vector with spacing and count controls.

Steps:
- Array: select geometry, then set direction, spacing, and count.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Gumball (`gumball`)

- Where: Command palette / toolbar
- Shortcut: W
- Description: Use handles to move, rotate, or scale. Click again to confirm, Esc cancels.

Steps:
- Gumball: click a handle to move/rotate/scale, click again to confirm.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Undo (`undo`)

- Where: Command palette / toolbar
- Shortcut: ⌘Z
- Description: Undo the last action. Repeat to step back through history.

Steps:
- Undo: click or press Cmd/Ctrl+Z to undo the last action.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Redo (`redo`)

- Where: Command palette / toolbar
- Shortcut: ⌘⇧Z
- Description: Redo the last undone action.

Steps:
- Redo: click or press Cmd+Shift+Z or Ctrl+Y.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Copy (`copy`)

- Where: Command palette / toolbar
- Shortcut: ⌘C
- Description: Copy the selected geometry to the clipboard.

Steps:
- Copy: click or press Cmd/Ctrl+C to copy selection.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Paste (`paste`)

- Where: Command palette / toolbar
- Shortcut: ⌘V
- Description: Paste geometry from the clipboard. Choose in place, cursor, or origin.

Steps:
- Paste: click or press Cmd/Ctrl+V. Choose placement: in place, cursor, origin.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Duplicate (`duplicate`)

- Where: Command palette / toolbar
- Shortcut: ⌘D
- Description: Duplicate the current selection in place.

Steps:
- Duplicate: click or press Cmd/Ctrl+D. Alt-drag also duplicates.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Delete (`delete`)

- Where: Command palette / toolbar
- Shortcut: ⌫
- Description: Delete the selected geometry.

Steps:
- Delete: click or press Delete/Backspace to remove selection.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Cancel (`cancel`)

- Where: Command palette / toolbar
- Description: Cancel: click or press Esc to cancel the active command.

Steps:
- Cancel: click or press Esc to cancel the active command.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Confirm (`confirm`)

- Where: Command palette / toolbar
- Description: Confirm: click or press Enter to commit the active command.

Steps:
- Confirm: click or press Enter to commit the active command.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Focus (`focus`)

- Where: Command palette / toolbar
- Shortcut: F
- Description: Frame the current selection for a tight view.

Steps:
- Focus: click to frame the current selection.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Frame All (`frameall`)

- Where: Command palette / toolbar
- Shortcut: ⇧F
- Description: Frame all visible geometry.

Steps:
- Frame All: click to frame all visible geometry.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Screenshot (`screenshot`)

- Where: Command palette / toolbar
- Description: Capture the current Roslyn viewport and open the export preview.

Steps:
- Screenshot: capture the current Roslyn viewport and open the export preview.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### View (`view`)

- Where: Command palette / toolbar
- Description: View: click to switch to top/front/right/perspective.

Steps:
- View: click to switch to top/front/right/perspective.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Camera (`camera`)

- Where: Command palette / toolbar
- Description: Camera: click to toggle camera options (zoom to cursor, invert zoom, upright).

Steps:
- Camera: click to toggle camera options (zoom to cursor, invert zoom, upright).

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Pivot (`pivot`)

- Where: Command palette / toolbar
- Description: Pivot: click a pivot mode, then click a point to place it.

Steps:
- Pivot: click a pivot mode, then click a point to place it.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Orbit (`orbit`)

- Where: Command palette / toolbar
- Description: Orbit: click-drag (right mouse) to orbit the view.

Steps:
- Orbit: click-drag (right mouse) to orbit the view.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Pan (`pan`)

- Where: Command palette / toolbar
- Description: Pan: click-drag (middle mouse or Shift+right) to pan.

Steps:
- Pan: click-drag (middle mouse or Shift+right) to pan.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Zoom (`zoom`)

- Where: Command palette / toolbar
- Description: Zoom: scroll to zoom in/out. Click to toggle zoom mode.

Steps:
- Zoom: scroll to zoom in/out. Click to toggle zoom mode.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Selection Filter (`selectionfilter`)

- Where: Command palette / toolbar
- Description: Selection Filter: click Object/Vertex/Edge/Face to change picks.

Steps:
- Selection Filter: click Object/Vertex/Edge/Face to change picks.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Cycle Selection (`cycle`)

- Where: Command palette / toolbar
- Description: Cycle: click to cycle overlapping picks (Tab also works).

Steps:
- Cycle: click to cycle overlapping picks (Tab also works).

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Snapping (`snapping`)

- Where: Command palette / toolbar
- Description: Snapping: click to toggle grid/vertex/endpoint/midpoint/intersection.

Steps:
- Snapping: click to toggle grid/vertex/endpoint/midpoint/intersection.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Grid (`grid`)

- Where: Command palette / toolbar
- Description: Grid: click to change spacing/units or toggle adaptive grid.

Steps:
- Grid: click to change spacing/units or toggle adaptive grid.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### C-Plane (`cplane`)

- Where: Command palette / toolbar
- Description: C-Plane: click world XY/XZ/YZ or click 3 points to define a plane.

Steps:
- C-Plane: click world XY/XZ/YZ or click 3 points to define a plane.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Display (`display`)

- Where: Command palette / toolbar
- Description: Display: click to switch wireframe/shaded/edges/ghosted/silhouette.

Steps:
- Display: click to switch wireframe/shaded/edges/ghosted/silhouette.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Isolate (`isolate`)

- Where: Command palette / toolbar
- Description: Isolate: click to hide/lock selection; click again to show all.

Steps:
- Isolate: click to hide/lock selection; click again to show all.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Outliner (`outliner`)

- Where: Command palette / toolbar
- Description: Outliner: click to manage groups, layers, and visibility.

Steps:
- Outliner: click to manage groups, layers, and visibility.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Tolerance (`tolerance`)

- Where: Command palette / toolbar
- Description: Tolerance: click to set absolute and angle tolerance.

Steps:
- Tolerance: click to set absolute and angle tolerance.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Status (`status`)

- Where: Command palette / toolbar
- Description: Status: click to toggle command help/status bar.

Steps:
- Status: click to toggle command help/status bar.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---

### Morph (`morph`)

- Where: Command palette / toolbar
- Description: Morph: select geometry, then click-drag to sculpt. Esc cancels.

Steps:
- Morph: select geometry, then click-drag to sculpt. Esc cancels.

Edge cases:
- Cancels with Esc.
- Requires a valid selection where applicable.

---
