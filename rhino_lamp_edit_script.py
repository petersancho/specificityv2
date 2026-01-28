# Rhino "EditPythonScript" file for a parametric lamp.
# Save and run inside Rhino: EditPythonScript -> Run.
# Units are assumed to be millimeters.
#
# This script builds:
# - A base (cube, triangle prism, or vase-like loft)
# - A parametric shade with a lattice or slot pattern
# - A tolerance-fit sleeve so the shade attaches to the base
# - A central port for lamp cord and LED bulb
#
# Edit the PARAMS below to tune the design.

import math
import rhinoscriptsyntax as rs


PARAMS = {
    # Base type: "cube", "triangle", or "vase"
    "base_type": "cube",
    "base_width": 80.0,
    "base_depth": 80.0,
    "base_height": 60.0,
    "triangle_side": 90.0,
    "vase_height": 75.0,
    "vase_base_radius": 42.0,
    "vase_mid_radius": 55.0,
    "vase_neck_radius": 34.0,
    # Base neck (attachment ring on top of the base)
    "neck_outer_radius": 24.0,
    "neck_height": 12.0,
    "neck_wall_min": 2.4,
    # Shade
    "shade_height": 120.0,
    "shade_outer_radius": 58.0,
    "shade_wall": 2.4,
    "sleeve_height": 14.0,  # must be >= neck_height
    "shade_pattern": "lattice",  # "lattice", "slots", or "none"
    # Assembly tolerance (clearance) for the sleeve fit
    "tolerance": 0.4,
    # Slot pattern
    "slot_count": 24,
    "slot_width": 6.0,
    "slot_depth": 12.0,
    "slot_margin": 12.0,
    "slot_variation": 0.25,
    "slot_wave_frequency": 2.0,
    # Lattice pattern (subdivision effect)
    "lattice_rows": 6,
    "lattice_columns": 30,
    "lattice_window_width": 8.0,
    "lattice_window_height": 18.0,
    "lattice_window_depth": 12.0,
    "lattice_margin": 12.0,
    "lattice_offset_ratio": 0.5,
    "lattice_twist_degrees": 8.0,
    # Central port
    "cord_diameter": 7.0,
    "bulb_diameter": 28.0,
    "port_clearance": 2.0,
}


def clamp_min(value, minimum):
    return value if value >= minimum else minimum


def to_single(obj):
    if isinstance(obj, (list, tuple)):
        return obj[0] if obj else None
    return obj


def safe_boolean_union(objs):
    objs = [o for o in objs if o]
    if not objs:
        return None
    return to_single(rs.BooleanUnion(objs, delete_input=True))


def safe_boolean_diff(target, cutters):
    if not target:
        return None
    cutters = [c for c in cutters if c]
    if not cutters:
        return target
    return to_single(rs.BooleanDifference(target, cutters, delete_input=True))


def cap_if_possible(obj_id):
    capped = rs.CapPlanarHoles(obj_id)
    if isinstance(capped, (list, tuple)):
        for item in capped:
            if hasattr(item, "ToString"):
                return item
    if hasattr(capped, "ToString"):
        return capped
    return obj_id


def add_box_centered(width, depth, height, base_z):
    x = width / 2.0
    y = depth / 2.0
    pts = [
        (-x, -y, base_z),
        (x, -y, base_z),
        (x, y, base_z),
        (-x, y, base_z),
        (-x, -y, base_z + height),
        (x, -y, base_z + height),
        (x, y, base_z + height),
        (-x, y, base_z + height),
    ]
    return rs.AddBox(pts)


def add_triangle_prism(side, height, base_z):
    r = side / math.sqrt(3.0)
    pts = []
    for i in range(3):
        angle = math.radians(90.0 + i * 120.0)
        pts.append((r * math.cos(angle), r * math.sin(angle), base_z))
    poly = rs.AddPolyline(pts + [pts[0]])
    surfaces = rs.AddPlanarSrf(poly)
    base = to_single(surfaces)
    path = rs.AddLine((0.0, 0.0, base_z), (0.0, 0.0, base_z + height))
    prism = rs.ExtrudeSurface(base, path)
    rs.DeleteObject(poly)
    rs.DeleteObject(base)
    rs.DeleteObject(path)
    return cap_if_possible(prism)


def add_vase(height, base_radius, mid_radius, neck_radius):
    circles = [
        rs.AddCircle((0.0, 0.0, 0.0), base_radius),
        rs.AddCircle((0.0, 0.0, height * 0.35), mid_radius),
        rs.AddCircle((0.0, 0.0, height * 0.7), neck_radius),
        rs.AddCircle((0.0, 0.0, height), neck_radius * 1.05),
    ]
    loft = rs.AddLoftSrf(circles)
    for c in circles:
        rs.DeleteObject(c)
    loft_id = to_single(loft)
    return cap_if_possible(loft_id)


def normalize_params(p):
    port_radius = max(p["cord_diameter"], p["bulb_diameter"]) / 2.0 + p["port_clearance"]
    min_neck_outer = port_radius + p["neck_wall_min"]
    if p["neck_outer_radius"] < min_neck_outer:
        p["neck_outer_radius"] = min_neck_outer
    min_shade_outer = p["neck_outer_radius"] + p["tolerance"] + p["shade_wall"]
    if p["shade_outer_radius"] < min_shade_outer:
        p["shade_outer_radius"] = min_shade_outer
    min_shade_height = p["neck_height"] + p["shade_wall"] * 2.0
    if p["shade_height"] < min_shade_height:
        p["shade_height"] = min_shade_height
    if p["sleeve_height"] < p["neck_height"]:
        p["sleeve_height"] = p["neck_height"] + 1.0
    max_sleeve = p["shade_height"] - p["shade_wall"] * 2.0
    if p["sleeve_height"] > max_sleeve:
        p["sleeve_height"] = max_sleeve
    return port_radius


def create_base(p, port_radius):
    base_type = p["base_type"].lower()
    base_height = p["base_height"]
    base_id = None

    if base_type == "cube":
        base_id = add_box_centered(p["base_width"], p["base_depth"], base_height, 0.0)
    elif base_type == "triangle":
        base_id = add_triangle_prism(p["triangle_side"], base_height, 0.0)
    elif base_type == "vase":
        base_id = add_vase(
            p["vase_height"],
            p["vase_base_radius"],
            p["vase_mid_radius"],
            p["vase_neck_radius"],
        )
        base_height = p["vase_height"]
    else:
        base_id = add_box_centered(p["base_width"], p["base_depth"], base_height, 0.0)

    neck = rs.AddCylinder((0.0, 0.0, base_height), p["neck_height"], p["neck_outer_radius"], cap=True)
    base_with_neck = safe_boolean_union([base_id, neck])

    port_height = base_height + p["neck_height"] + 5.0
    port_cyl = rs.AddCylinder((0.0, 0.0, -2.0), port_height, port_radius, cap=True)
    base_with_neck = safe_boolean_diff(base_with_neck, [port_cyl])

    rs.ObjectName(base_with_neck, "Lamp_Base")
    return base_with_neck, base_height


def add_slot_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
):
    shade_wall = p["shade_wall"]
    shade_height = p["shade_height"]
    slot_count = int(p["slot_count"])
    if slot_count <= 0:
        return shade

    slot_depth = clamp_min(p["slot_depth"], shade_wall + 1.0)
    slot_width = p["slot_width"]
    slot_margin = p["slot_margin"]
    slot_body_height = shade_height - sleeve_height - 2.0 * slot_margin
    if slot_body_height <= shade_wall:
        return shade

    slot_inner = min(shade_inner_radius - 1.0, shade_outer_radius - slot_depth)
    slot_inner = max(0.5, slot_inner)
    slot_outer = shade_outer_radius + 1.0
    slot_min_y = -slot_width / 2.0
    slot_max_y = slot_width / 2.0

    slots = []
    for i in range(slot_count):
        angle = (360.0 / slot_count) * i
        angle_rad = math.radians(angle)
        wave = 0.5 + 0.5 * math.sin(angle_rad * p["slot_wave_frequency"])
        height_scale = 1.0 - p["slot_variation"] * wave
        slot_h = clamp_min(slot_body_height * height_scale, shade_wall * 2.0)
        slot_z0 = base_height + sleeve_height + slot_margin
        slot_top_limit = base_height + shade_height - slot_margin
        slot_h = min(slot_h, slot_top_limit - slot_z0)
        if slot_h <= shade_wall:
            continue
        slot_z1 = slot_z0 + slot_h

        pts = [
            (slot_inner, slot_min_y, slot_z0),
            (slot_outer, slot_min_y, slot_z0),
            (slot_outer, slot_max_y, slot_z0),
            (slot_inner, slot_max_y, slot_z0),
            (slot_inner, slot_min_y, slot_z1),
            (slot_outer, slot_min_y, slot_z1),
            (slot_outer, slot_max_y, slot_z1),
            (slot_inner, slot_max_y, slot_z1),
        ]
        slot = rs.AddBox(pts)
        rs.RotateObject(slot, (0.0, 0.0, 0.0), angle, axis=(0.0, 0.0, 1.0))
        slots.append(slot)

    return safe_boolean_diff(shade, slots)


def add_lattice_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
):
    shade_wall = p["shade_wall"]
    shade_height = p["shade_height"]
    rows = int(p["lattice_rows"])
    columns = int(p["lattice_columns"])
    if rows <= 0 or columns <= 0:
        return shade

    margin = p["lattice_margin"]
    available_height = shade_height - sleeve_height - 2.0 * margin
    if available_height <= shade_wall:
        return shade

    row_step = available_height / float(rows)
    window_height = min(p["lattice_window_height"], row_step * 0.85)
    if window_height <= shade_wall:
        return shade

    window_depth = clamp_min(p["lattice_window_depth"], shade_wall + 1.0)
    window_width = p["lattice_window_width"]
    angle_step = 360.0 / float(columns)

    slot_inner = min(shade_inner_radius - 1.0, shade_outer_radius - window_depth)
    slot_inner = max(0.5, slot_inner)
    slot_outer = shade_outer_radius + 1.0
    slot_min_y = -window_width / 2.0
    slot_max_y = window_width / 2.0

    slots = []
    for row in range(rows):
        row_center = base_height + sleeve_height + margin + row_step * (row + 0.5)
        z0 = row_center - window_height / 2.0
        z1 = row_center + window_height / 2.0
        z0 = max(z0, base_height + sleeve_height + margin)
        z1 = min(z1, base_height + shade_height - margin)
        if z1 - z0 <= shade_wall:
            continue

        row_twist = row * p["lattice_twist_degrees"]
        row_offset = (row % 2) * p["lattice_offset_ratio"] * angle_step
        for col in range(columns):
            angle = col * angle_step + row_offset + row_twist
            pts = [
                (slot_inner, slot_min_y, z0),
                (slot_outer, slot_min_y, z0),
                (slot_outer, slot_max_y, z0),
                (slot_inner, slot_max_y, z0),
                (slot_inner, slot_min_y, z1),
                (slot_outer, slot_min_y, z1),
                (slot_outer, slot_max_y, z1),
                (slot_inner, slot_max_y, z1),
            ]
            slot = rs.AddBox(pts)
            rs.RotateObject(slot, (0.0, 0.0, 0.0), angle, axis=(0.0, 0.0, 1.0))
            slots.append(slot)

    return safe_boolean_diff(shade, slots)


def apply_shade_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
):
    pattern = p.get("shade_pattern", "slots").lower()
    if not shade or pattern == "none":
        return shade
    if pattern == "lattice":
        return add_lattice_pattern(
            shade,
            p,
            base_height,
            sleeve_height,
            shade_outer_radius,
            shade_inner_radius,
        )
    return add_slot_pattern(
        shade,
        p,
        base_height,
        sleeve_height,
        shade_outer_radius,
        shade_inner_radius,
    )


def create_shade(p, base_height):
    shade_outer_radius = p["shade_outer_radius"]
    shade_wall = p["shade_wall"]
    shade_height = p["shade_height"]
    sleeve_height = p["sleeve_height"]

    shade_inner_radius = shade_outer_radius - shade_wall
    sleeve_inner_radius = p["neck_outer_radius"] + p["tolerance"]

    # Outer shell for the shade
    outer = rs.AddCylinder((0.0, 0.0, base_height), shade_height, shade_outer_radius, cap=True)

    # Inner cavity for the upper body (wider)
    upper_height = clamp_min(shade_height - sleeve_height, shade_wall * 2.0)
    inner_upper = rs.AddCylinder(
        (0.0, 0.0, base_height + sleeve_height),
        upper_height,
        shade_inner_radius,
        cap=True,
    )

    # Inner cavity for the sleeve (narrower to fit the neck)
    inner_sleeve = rs.AddCylinder(
        (0.0, 0.0, base_height),
        sleeve_height,
        sleeve_inner_radius,
        cap=True,
    )

    shade = safe_boolean_diff(outer, [inner_upper, inner_sleeve])

    shade = apply_shade_pattern(
        shade,
        p,
        base_height,
        sleeve_height,
        shade_outer_radius,
        shade_inner_radius,
    )

    rs.ObjectName(shade, "Lamp_Shade")
    return shade


def main():
    rs.EnableRedraw(False)
    try:
        params = dict(PARAMS)
        port_radius = normalize_params(params)
        base_id, base_height = create_base(params, port_radius)
        create_shade(params, base_height)
        rs.SelectObject(base_id)
    finally:
        rs.EnableRedraw(True)


if __name__ == "__main__":
    main()
