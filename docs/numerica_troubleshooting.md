# Numerica Troubleshooting & Pitfalls

Updated: 2026-01-30

This list covers the most common graph issues encountered during testing.

## Top Issues (30)

1. **No outputs on a node** → Check that required inputs are connected.
2. **Geometry viewer is blank** → Ensure geometry output is wired to viewer.
3. **Solver throws goal validation error** → Goal nodes from the wrong family are connected.
4. **Solver never converges** → Reduce resolution or lower iterations; check goals.
5. **Voxel output is empty** → Domain bounds too small or resolution too low.
6. **Expression node has no inputs** → Expression has no variables (defaults to `value`).
7. **List nodes return unexpected nesting** → Flatten or partition list explicitly.
8. **Vector nodes output zero vectors** → Inputs are missing or invalid.
9. **Mesh conversion looks faceted** → Increase tessellation parameters.
10. **Boolean fails** → Input meshes are non-manifold or self-intersecting.
11. **Offset creates gaps** → Input curves are open or not planar.
12. **Transform outputs unchanged** → Selection or input geometry missing.
13. **STL Export produces empty file** → No geometry connected or geometry has no mesh.
14. **STL Import fails** → File not selected or unsupported format.
15. **Slider doesn't update downstream** → Ensure inline editor is closed and node is active.
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

## Physics Solver Issues

26. **Physics Solver fails immediately** → Missing Anchor goal. Every physics solver needs at least one Anchor goal to define boundary conditions.
27. **Load goal ignored** → Volume goal missing. When using Load goals, a Volume goal is required to define material properties.
28. **Anchor vertices have no effect** → Anchor vertex indices are outside mesh bounds. Verify vertex indices match mesh vertices.
29. **Deformation exceeds limits** → Check `maxDeformation` parameter. Lower the limit or fix goal configuration.
30. **Stress field all zeros** → No load applied or all nodes anchored. Ensure meaningful load distribution.

## Diagnostic Checklist

- Verify node inputs and output port types.
- Check console for runtime errors.
- Confirm geometry ids are valid (Geometry Reference node).
- For solvers: ensure at least one goal of each required type.
- For Physics Solver: verify Anchor + (Load → Volume) relationship.

## Quick Reference: Physics Solver Requirements

| Goal Combination | Valid? | Notes |
|------------------|--------|-------|
| Anchor only | ✅ | Minimal setup, computes static state |
| Anchor + Load | ❌ | Missing Volume goal |
| Anchor + Load + Volume | ✅ | Complete structural setup |
| Anchor + Stiffness | ✅ | Material properties defined |
| Anchor + Load + Volume + Stiffness | ✅ | Full analysis with material |

## Test Rig

Use **right-click → "Add Physics Solver Rig"** to create a pre-wired cantilevered canopy setup with all required goals. This is useful for testing and learning.
