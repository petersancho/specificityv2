# Numerica Troubleshooting & Pitfalls

Updated: 2026-01-29

This list covers the most common graph issues encountered during testing.

## Top Issues (25)

1. **No outputs on a node** → Check that required inputs are connected.
2. **Geometry viewer is blank** → Ensure geometry output is wired to viewer.
3. **Solver throws goal validation error** → Goal nodes from the wrong family are connected.
4. **Solver never converges** → Reduce resolution or lower iterations; check goals.
5. **Voxel output is empty** → Domain bounds too small or resolution too low.
6. **Expression node has no inputs** → Expression has no variables (defaults to `value`).
7. **List nodes return unexpected nesting** → Flatten or partition list explicitly.
8. **Vector nodes output zero vectors** → Inputs are missing or invalid.
9. **Mesh conversion looks faceted** → Increase tessellation parameters.
10. **Boolean fails** → Input meshes are non‑manifold or self‑intersecting.
11. **Offset creates gaps** → Input curves are open or not planar.
12. **Transform outputs unchanged** → Selection or input geometry missing.
13. **STL Export produces empty file** → No geometry connected or geometry has no mesh.
14. **STL Import fails** → File not selected or unsupported format.
15. **Slider doesn’t update downstream** → Ensure inline editor is closed and node is active.
16. **No graph updates after parameter edit** → Node remains cached; force a minor change.
17. **Goal weights dominate** → Normalize goal weights in solver.
18. **Seeds have no effect** → Seeds outside the domain.
19. **Mesh normals inverted** → Use `Mesh Flip` command.
20. **Broken selection** → Clear selection and reselect with Ctrl/Cmd+A.
21. **Workspace lag** → Hide geometry preview nodes or reduce graph size.
22. **Graph drag stutter** → Disable grid snap or zoom out.
23. **Gumball not visible** → Ensure selection mode is object and geometry exists.
24. **Undo not working in Numerica** → Focus must be within Numerica panel.
25. **Shortcut overlay missing** → Toggle `?` to show shortcuts.

## Diagnostic Checklist

- Verify node inputs and output port types.
- Check console for runtime errors.
- Confirm geometry ids are valid (Geometry Reference node).

