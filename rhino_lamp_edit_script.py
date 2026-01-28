# Rhino "EditPythonScript" file for a parametric lamp.
# Save and run inside Rhino: EditPythonScript -> Run.
# Units are assumed to be millimeters.
#
# This script builds:
# - A base (cube, triangle prism, vase loft, twisted, spiral, or ripple base)
# - A lofted shade subdivided and blobtruded along normals
# - A tolerance-fit sleeve so the shade attaches to the base
# - A central port for lamp cord and LED bulb
#
# Edit the PARAMS below to tune the design.

import math
import rhinoscriptsyntax as rs


PARAMS = {
    # Base type: "cube", "triangle", "vase", "twisted", "spiral", or "ripple"
    "base_type": "triangle",
    "base_width": 76.0,
    "base_depth": 76.0,
    "base_height": 52.0,
    "triangle_side": 108.0,
    "vase_height": 84.0,
    "vase_base_radius": 44.0,
    "vase_mid_radius": 62.0,
    "vase_neck_radius": 26.0,
    # Twisted base (faceted loft)
    "twist_height": 70.0,
    "twist_radius": 42.0,
    "twist_top_scale": 0.72,
    "twist_sides": 6,
    "twist_layers": 8,
    "twist_rotation": 95.0,
    # Spiral wave base (smooth wave loft)
    "spiral_height": 78.0,
    "spiral_radius": 46.0,
    "spiral_top_scale": 0.66,
    "spiral_waves": 6,
    "spiral_wave_amp": 0.2,
    "spiral_layers": 10,
    "spiral_twist": 150.0,
    "spiral_points_per_wave": 12,
    # Ripple base (scalloped wave loft)
    "ripple_height": 72.0,
    "ripple_radius": 48.0,
    "ripple_top_scale": 0.68,
    "ripple_waves": 7,
    "ripple_wave_amp": 0.21,
    "ripple_layers": 10,
    "ripple_twist": 30.0,
    "ripple_points_per_wave": 12,
    # Base neck (attachment ring on top of the base)
    "neck_outer_radius": 22.0,
    "neck_height": 14.0,
    "neck_wall_min": 2.6,
    # Shade
    "shade_form": "lofted",  # "lofted" or "cylindrical"
    "shade_height": 138.0,
    "shade_outer_radius": 52.0,
    "shade_wall": 2.6,
    "sleeve_height": 16.0,  # must be >= neck_height
    "shade_pattern": "blobtrude",  # "blobtrude", "manglutified", "moire", "weave", "lattice", "slots", or "none"
    # Lofted shade profile
    "shade_loft_bottom_sides": 3,
    "shade_loft_top_sides": 24,
    "shade_loft_top_scale": 1.3,
    "shade_loft_twist": 30.0,
    # Assembly tolerance (clearance) for the sleeve fit
    "tolerance": 0.45,
    # Slot pattern
    "slot_count": 26,
    "slot_width": 5.0,
    "slot_depth": 10.0,
    "slot_margin": 12.0,
    "slot_variation": 0.3,
    "slot_wave_frequency": 2.2,
    # Lattice pattern (subdivision effect)
    "lattice_rows": 6,
    "lattice_columns": 30,
    "lattice_window_width": 7.0,
    "lattice_window_height": 18.0,
    "lattice_window_depth": 11.0,
    "lattice_margin": 12.0,
    "lattice_offset_ratio": 0.5,
    "lattice_twist_degrees": 10.0,
    # Helical weave pattern
    "weave_strand_count": 8,
    "weave_turns": 1.4,
    "weave_pipe_radius": 3.1,
    "weave_steps": 70,
    "weave_margin": 12.0,
    # Moire pattern (multi-helix + ring bands)
    "moire_strand_count": 9,
    "moire_turns_primary": 1.6,
    "moire_turns_secondary": 2.4,
    "moire_pipe_radius": 2.6,
    "moire_steps": 85,
    "moire_rings": 6,
    "moire_ring_radius": 2.2,
    "moire_margin": 10.0,
    # Bubble pattern (organic perforations)
    "bubble_rows": 7,
    "bubble_columns": 24,
    "bubble_radius": 5.5,
    "bubble_margin": 10.0,
    "bubble_offset_ratio": 0.5,
    "bubble_radius_variation": 0.25,
    "bubble_twist": 10.0,
    "bubble_wave_frequency": 1.6,
    # Blobtrude pattern (subdivided loft + normal blobs)
    "blob_rows": 9,
    "blob_columns": 20,
    "blob_radius": 5.0,
    "blob_offset": 2.2,
    "blob_margin": 10.0,
    "blob_radius_variation": 0.35,
    "blob_twist": 18.0,
    "blob_mangle": 0.45,
    "blob_jitter": 1.2,
    "blob_wave_frequency": 1.7,
    # Central port
    "cord_diameter": 7.0,
    "bulb_diameter": 30.0,
    "port_clearance": 2.6,
}


def clamp_min(value, minimum):
    return value if value >= minimum else minimum


def clamp_range(value, min_value, max_value):
    if value < min_value:
        return min_value
    if value > max_value:
        return max_value
    return value


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


def add_polygon_curve(radius, sides, z, rotation_degrees):
    sides = max(3, int(sides))
    pts = []
    for i in range(sides):
        angle = math.radians(rotation_degrees + i * (360.0 / sides))
        pts.append((radius * math.cos(angle), radius * math.sin(angle), z))
    pts.append(pts[0])
    return rs.AddPolyline(pts)


def add_twisted_base(height, radius, top_scale, sides, layers, rotation_degrees):
    layers = max(2, int(layers))
    curves = []
    for i in range(layers + 1):
        t = float(i) / float(layers)
        z = height * t
        r = radius * (1.0 - (1.0 - top_scale) * t)
        rot = rotation_degrees * t
        curve = add_polygon_curve(r, sides, z, rot)
        if curve:
            curves.append(curve)
    if not curves:
        return None
    loft = rs.AddLoftSrf(curves)
    for curve in curves:
        rs.DeleteObject(curve)
    loft_id = to_single(loft)
    return cap_if_possible(loft_id)


def add_wave_curve(radius, waves, amplitude, points_per_wave, z, rotation_degrees):
    waves = max(1, int(waves))
    points_per_wave = max(6, int(points_per_wave))
    total_points = waves * points_per_wave
    rot = math.radians(rotation_degrees)
    pts = []
    for i in range(total_points):
        angle = (2.0 * math.pi) * (float(i) / float(total_points))
        wave = 1.0 + amplitude * math.sin(waves * angle)
        r = radius * wave
        x = r * math.cos(angle + rot)
        y = r * math.sin(angle + rot)
        pts.append((x, y, z))
    pts.append(pts[0])
    return rs.AddPolyline(pts)


def add_spiral_base(
    height,
    radius,
    top_scale,
    waves,
    amplitude,
    layers,
    twist_degrees,
    points_per_wave,
):
    layers = max(2, int(layers))
    curves = []
    for i in range(layers + 1):
        t = float(i) / float(layers)
        z = height * t
        r = radius * (1.0 - (1.0 - top_scale) * t)
        amp = amplitude * (1.0 - 0.3 * t)
        rot = twist_degrees * t
        curve = add_wave_curve(r, waves, amp, points_per_wave, z, rot)
        if curve:
            curves.append(curve)
    if not curves:
        return None
    loft = rs.AddLoftSrf(curves)
    for curve in curves:
        rs.DeleteObject(curve)
    loft_id = to_single(loft)
    return cap_if_possible(loft_id)


def add_ripple_base(
    height,
    radius,
    top_scale,
    waves,
    amplitude,
    layers,
    twist_degrees,
    points_per_wave,
):
    layers = max(2, int(layers))
    curves = []
    for i in range(layers + 1):
        t = float(i) / float(layers)
        z = height * t
        r = radius * (1.0 - (1.0 - top_scale) * t)
        amp = amplitude * (0.85 + 0.25 * math.sin(t * math.pi))
        rot = twist_degrees * t
        curve = add_wave_curve(r, waves, amp, points_per_wave, z, rot)
        if curve:
            curves.append(curve)
    if not curves:
        return None
    loft = rs.AddLoftSrf(curves)
    for curve in curves:
        rs.DeleteObject(curve)
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
    p["shade_loft_bottom_sides"] = max(3, int(p.get("shade_loft_bottom_sides", 3)))
    p["shade_loft_top_sides"] = max(3, int(p.get("shade_loft_top_sides", 12)))
    p["shade_loft_top_scale"] = clamp_range(p.get("shade_loft_top_scale", 1.0), 0.5, 1.8)
    if p["sleeve_height"] < p["neck_height"]:
        p["sleeve_height"] = p["neck_height"] + 1.0
    max_sleeve = p["shade_height"] - p["shade_wall"] * 2.0
    if p["sleeve_height"] > max_sleeve:
        p["sleeve_height"] = max_sleeve
    p["twist_sides"] = max(3, int(p.get("twist_sides", 6)))
    p["twist_layers"] = max(2, int(p.get("twist_layers", 6)))
    p["spiral_waves"] = max(2, int(p.get("spiral_waves", 5)))
    p["spiral_layers"] = max(3, int(p.get("spiral_layers", 8)))
    p["spiral_points_per_wave"] = max(6, int(p.get("spiral_points_per_wave", 10)))
    p["spiral_wave_amp"] = max(0.02, min(p.get("spiral_wave_amp", 0.15), 0.45))
    p["ripple_waves"] = max(2, int(p.get("ripple_waves", 6)))
    p["ripple_layers"] = max(3, int(p.get("ripple_layers", 8)))
    p["ripple_points_per_wave"] = max(6, int(p.get("ripple_points_per_wave", 10)))
    p["ripple_wave_amp"] = max(0.02, min(p.get("ripple_wave_amp", 0.18), 0.45))
    p["weave_strand_count"] = max(2, int(p.get("weave_strand_count", 6)))
    p["weave_steps"] = max(12, int(p.get("weave_steps", 48)))
    p["moire_strand_count"] = max(3, int(p.get("moire_strand_count", 8)))
    p["moire_steps"] = max(16, int(p.get("moire_steps", 64)))
    p["moire_rings"] = max(0, int(p.get("moire_rings", 4)))
    p["bubble_rows"] = max(1, int(p.get("bubble_rows", 6)))
    p["bubble_columns"] = max(6, int(p.get("bubble_columns", 18)))
    p["bubble_offset_ratio"] = max(0.0, min(p.get("bubble_offset_ratio", 0.5), 1.0))
    p["bubble_radius_variation"] = max(0.0, min(p.get("bubble_radius_variation", 0.3), 0.8))
    p["blob_rows"] = max(1, int(p.get("blob_rows", 6)))
    p["blob_columns"] = max(6, int(p.get("blob_columns", 16)))
    p["blob_radius"] = max(1.0, p.get("blob_radius", 5.0))
    p["blob_offset"] = max(0.5, p.get("blob_offset", 2.0))
    p["blob_margin"] = max(0.0, p.get("blob_margin", 8.0))
    p["blob_radius_variation"] = max(0.0, min(p.get("blob_radius_variation", 0.25), 0.8))
    p["blob_mangle"] = max(0.0, min(p.get("blob_mangle", 0.3), 1.0))
    p["blob_jitter"] = max(0.0, p.get("blob_jitter", 0.8))
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
    elif base_type in ("twisted", "twist", "faceted"):
        base_id = add_twisted_base(
            p["twist_height"],
            p["twist_radius"],
            p["twist_top_scale"],
            p["twist_sides"],
            p["twist_layers"],
            p["twist_rotation"],
        )
        base_height = p["twist_height"]
    elif base_type in ("spiral", "wave", "ripples"):
        base_id = add_spiral_base(
            p["spiral_height"],
            p["spiral_radius"],
            p["spiral_top_scale"],
            p["spiral_waves"],
            p["spiral_wave_amp"],
            p["spiral_layers"],
            p["spiral_twist"],
            p["spiral_points_per_wave"],
        )
        base_height = p["spiral_height"]
    elif base_type in ("ripple", "scallop", "scalloped"):
        base_id = add_ripple_base(
            p["ripple_height"],
            p["ripple_radius"],
            p["ripple_top_scale"],
            p["ripple_waves"],
            p["ripple_wave_amp"],
            p["ripple_layers"],
            p["ripple_twist"],
            p["ripple_points_per_wave"],
        )
        base_height = p["ripple_height"]
    else:
        base_id = add_box_centered(p["base_width"], p["base_depth"], base_height, 0.0)

    neck = rs.AddCylinder((0.0, 0.0, base_height), p["neck_height"], p["neck_outer_radius"], cap=True)
    base_with_neck = safe_boolean_union([base_id, neck])

    port_height = base_height + p["neck_height"] + 5.0
    port_cyl = rs.AddCylinder((0.0, 0.0, -2.0), port_height, port_radius, cap=True)
    base_with_neck = safe_boolean_diff(base_with_neck, [port_cyl])

    rs.ObjectName(base_with_neck, "Lamp_Base")
    return base_with_neck, base_height


def create_lofted_shade(p, base_height):
    shade_outer_radius = p["shade_outer_radius"]
    shade_height = p["shade_height"]
    shade_wall = p["shade_wall"]
    sleeve_height = p["sleeve_height"]
    sleeve_inner_radius = p["neck_outer_radius"] + p["tolerance"]

    bottom_z = base_height
    top_z = base_height + shade_height
    top_radius = shade_outer_radius * p["shade_loft_top_scale"]

    bottom_curve = add_polygon_curve(
        shade_outer_radius,
        p["shade_loft_bottom_sides"],
        bottom_z,
        0.0,
    )
    top_curve = add_polygon_curve(
        top_radius,
        p["shade_loft_top_sides"],
        top_z,
        p["shade_loft_twist"],
    )

    outer_loft = to_single(rs.AddLoftSrf([bottom_curve, top_curve]))
    outer_shell = None
    if outer_loft:
        outer_copy = rs.CopyObject(outer_loft)
        if outer_copy:
            outer_shell = cap_if_possible(outer_copy)
        if not outer_shell:
            outer_shell = cap_if_possible(outer_loft)

    inner_bottom_radius = max(shade_outer_radius - shade_wall, shade_wall)
    inner_top_radius = max(top_radius - shade_wall, shade_wall)
    inner_bottom_curve = add_polygon_curve(
        inner_bottom_radius,
        p["shade_loft_bottom_sides"],
        base_height + sleeve_height,
        0.0,
    )
    inner_top_curve = add_polygon_curve(
        inner_top_radius,
        p["shade_loft_top_sides"],
        top_z,
        p["shade_loft_twist"],
    )
    inner_loft = to_single(rs.AddLoftSrf([inner_bottom_curve, inner_top_curve]))
    inner_shell = cap_if_possible(inner_loft) if inner_loft else None

    inner_sleeve = rs.AddCylinder(
        (0.0, 0.0, base_height),
        sleeve_height,
        sleeve_inner_radius,
        cap=True,
    )

    shade = safe_boolean_diff(outer_shell, [inner_shell, inner_sleeve])

    for curve in [bottom_curve, top_curve, inner_bottom_curve, inner_top_curve]:
        if curve:
            rs.DeleteObject(curve)
    if inner_loft and inner_loft != inner_shell:
        rs.DeleteObject(inner_loft)

    pattern_surface = outer_loft if rs.IsSurface(outer_loft) else None
    return shade, pattern_surface


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


def build_helix_curve(radius, z0, z1, start_angle, turns, steps):
    steps = max(8, int(steps))
    pts = []
    for i in range(steps + 1):
        t = float(i) / float(steps)
        angle = math.radians(start_angle + turns * 360.0 * t)
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        z = z0 + (z1 - z0) * t
        pts.append((x, y, z))
    return rs.AddPolyline(pts)


def build_helix_pipes(
    strands,
    turns,
    radius,
    z0,
    z1,
    steps,
    pipe_radius,
    angle_offset,
):
    strands = max(1, int(strands))
    angle_step = 360.0 / float(strands)
    pipes = []
    for i in range(strands):
        start_angle = i * angle_step + angle_offset
        curve = build_helix_curve(radius, z0, z1, start_angle, turns, steps)
        if not curve:
            continue
        domain = rs.CurveDomain(curve)
        pipe = to_single(rs.AddPipe(curve, [domain[0], domain[1]], [pipe_radius, pipe_radius], cap=1))
        rs.DeleteObject(curve)
        if pipe:
            pipes.append(pipe)
    return pipes


def add_weave_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
):
    shade_wall = p["shade_wall"]
    shade_height = p["shade_height"]
    strands = int(p["weave_strand_count"])
    if strands <= 0:
        return shade

    margin = p["weave_margin"]
    z0 = base_height + sleeve_height + margin
    z1 = base_height + shade_height - margin
    if z1 - z0 <= shade_wall:
        return shade

    turns = p["weave_turns"]
    steps = max(8, int(p["weave_steps"]))
    pipe_center_radius = max(0.5, shade_outer_radius - shade_wall * 0.5)
    min_pipe_radius = shade_wall * 0.5 + 0.2
    pipe_radius = max(p["weave_pipe_radius"], min_pipe_radius)
    angle_step = 360.0 / float(strands)

    pipes = []
    pipes.extend(
        build_helix_pipes(
            strands,
            turns,
            pipe_center_radius,
            z0,
            z1,
            steps,
            pipe_radius,
            0.0,
        )
    )
    pipes.extend(
        build_helix_pipes(
            strands,
            -turns,
            pipe_center_radius,
            z0,
            z1,
            steps,
            pipe_radius,
            angle_step * 0.5,
        )
    )

    return safe_boolean_diff(shade, pipes)


def add_moire_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
):
    shade_wall = p["shade_wall"]
    shade_height = p["shade_height"]
    strands = int(p["moire_strand_count"])
    if strands <= 0:
        return shade

    margin = p["moire_margin"]
    z0 = base_height + sleeve_height + margin
    z1 = base_height + shade_height - margin
    if z1 - z0 <= shade_wall:
        return shade

    turns_primary = p["moire_turns_primary"]
    turns_secondary = p["moire_turns_secondary"]
    steps = max(12, int(p["moire_steps"]))
    pipe_center_radius = max(0.5, shade_outer_radius - shade_wall * 0.5)
    min_pipe_radius = shade_wall * 0.45 + 0.15
    pipe_radius = max(p["moire_pipe_radius"], min_pipe_radius)
    angle_step = 360.0 / float(strands)

    cutters = []
    cutters.extend(
        build_helix_pipes(
            strands,
            turns_primary,
            pipe_center_radius,
            z0,
            z1,
            steps,
            pipe_radius,
            0.0,
        )
    )
    cutters.extend(
        build_helix_pipes(
            strands,
            -turns_primary,
            pipe_center_radius,
            z0,
            z1,
            steps,
            pipe_radius,
            angle_step * 0.5,
        )
    )
    cutters.extend(
        build_helix_pipes(
            strands,
            turns_secondary,
            pipe_center_radius,
            z0,
            z1,
            steps,
            pipe_radius * 0.75,
            angle_step * 0.25,
        )
    )

    ring_count = int(p["moire_rings"])
    if ring_count > 0:
        ring_radius = max(0.6, p["moire_ring_radius"])
        step = (z1 - z0) / float(ring_count + 1)
        for i in range(ring_count):
            z = z0 + step * (i + 1)
            torus = rs.AddTorus((0.0, 0.0, z), pipe_center_radius, ring_radius)
            if torus:
                cutters.append(torus)

    return safe_boolean_diff(shade, cutters)


def add_bubble_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
):
    shade_wall = p["shade_wall"]
    shade_height = p["shade_height"]
    rows = int(p["bubble_rows"])
    columns = int(p["bubble_columns"])
    if rows <= 0 or columns <= 0:
        return shade

    margin = p["bubble_margin"]
    z0 = base_height + sleeve_height + margin
    z1 = base_height + shade_height - margin
    if z1 - z0 <= shade_wall:
        return shade

    row_step = (z1 - z0) / float(rows)
    angle_step = 360.0 / float(columns)
    center_radius = shade_outer_radius - shade_wall * 0.4
    center_radius = max(center_radius, shade_inner_radius + p["bubble_radius"] * 0.6)
    base_radius = max(p["bubble_radius"], shade_wall * 0.8)

    bubbles = []
    for row in range(rows):
        row_phase = row * p["bubble_wave_frequency"]
        wave = 0.5 + 0.5 * math.sin(row_phase)
        radius_scale = 1.0 - p["bubble_radius_variation"] * wave
        bubble_radius = max(base_radius * radius_scale, shade_wall * 0.8)
        row_offset = (row % 2) * p["bubble_offset_ratio"] * angle_step
        z = z0 + row_step * (row + 0.5)
        for col in range(columns):
            angle = col * angle_step + row_offset + row * p["bubble_twist"]
            angle_rad = math.radians(angle)
            x = center_radius * math.cos(angle_rad)
            y = center_radius * math.sin(angle_rad)
            sphere = rs.AddSphere((x, y, z), bubble_radius)
            if sphere:
                bubbles.append(sphere)

    return safe_boolean_diff(shade, bubbles)


def add_blobtrude_pattern(
    shade,
    p,
    pattern_surface,
    base_height,
    sleeve_height,
):
    if not shade or not pattern_surface:
        return shade

    rows = int(p["blob_rows"])
    columns = int(p["blob_columns"])
    if rows <= 0 or columns <= 0:
        return shade

    dom_u = rs.SurfaceDomain(pattern_surface, 0)
    dom_v = rs.SurfaceDomain(pattern_surface, 1)
    if not dom_u or not dom_v:
        return shade

    u_range = dom_u[1] - dom_u[0]
    v_range = dom_v[1] - dom_v[0]
    if u_range <= 0.0 or v_range <= 0.0:
        return shade

    margin = p["blob_margin"]
    base_radius = max(p["blob_radius"], p["shade_wall"] * 0.7)
    wave_freq = p["blob_wave_frequency"]
    mangle = p["blob_mangle"]
    jitter = p["blob_jitter"]
    row_twist = p["blob_twist"]

    blobs = []
    for row in range(rows):
        v = dom_v[0] + v_range * (row + 0.5) / float(rows)
        u_twist = (row_twist * row / float(rows)) / 360.0 * u_range
        for col in range(columns):
            u = dom_u[0] + u_range * (col + 0.5) / float(columns) + u_twist
            u_offset = math.sin((row + col) * wave_freq) * mangle * (u_range / columns)
            u = clamp_range(u + u_offset, dom_u[0], dom_u[1])

            pt = rs.EvaluateSurface(pattern_surface, u, v)
            if not pt:
                continue
            if pt[2] < base_height + sleeve_height + margin:
                continue
            if pt[2] > base_height + p["shade_height"] - margin:
                continue

            normal = rs.SurfaceNormal(pattern_surface, (u, v))
            normal = rs.VectorUnitize(normal)
            if not normal:
                continue

            radial = rs.VectorUnitize((pt[0], pt[1], 0.0))
            if radial:
                pt = rs.PointAdd(pt, rs.VectorScale(radial, jitter))

            wave = 0.5 + 0.5 * math.sin((row * 1.1 + col) * wave_freq)
            radius = base_radius * (1.0 - p["blob_radius_variation"] * wave)
            radius = max(radius, p["shade_wall"] * 0.6)

            offset = p["blob_offset"] * (0.75 + 0.25 * math.cos((row + col) * 0.8))
            center = rs.PointAdd(pt, rs.VectorScale(normal, offset))
            sphere = rs.AddSphere(center, radius)
            if sphere:
                blobs.append(sphere)

    return safe_boolean_diff(shade, blobs)


def apply_shade_pattern(
    shade,
    p,
    base_height,
    sleeve_height,
    shade_outer_radius,
    shade_inner_radius,
    pattern_surface=None,
):
    pattern = p.get("shade_pattern", "slots").lower()
    if not shade or pattern == "none":
        return shade
    if pattern in ("blobtrude", "manglutified", "mangle", "blob"):
        return add_blobtrude_pattern(
            shade,
            p,
            pattern_surface,
            base_height,
            sleeve_height,
        )
    if pattern == "bubble":
        return add_bubble_pattern(
            shade,
            p,
            base_height,
            sleeve_height,
            shade_outer_radius,
            shade_inner_radius,
        )
    if pattern == "moire":
        return add_moire_pattern(
            shade,
            p,
            base_height,
            sleeve_height,
            shade_outer_radius,
            shade_inner_radius,
        )
    if pattern == "weave":
        return add_weave_pattern(
            shade,
            p,
            base_height,
            sleeve_height,
            shade_outer_radius,
            shade_inner_radius,
        )
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

    pattern_surface = None
    shade_form = p.get("shade_form", "cylindrical").lower()
    if shade_form == "lofted":
        shade, pattern_surface = create_lofted_shade(p, base_height)
    else:
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
        pattern_surface,
    )
    if pattern_surface and pattern_surface != shade:
        rs.DeleteObject(pattern_surface)

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
