"""Build the web-ready casino props in Blender and export their GLB variants.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/generate_blender_models.py

The source scene is retained in assets/models/casino_props.blend. The models use
only PBR materials and beveled geometry so the GLBs stay compact and need no
external texture files at runtime.
"""
import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "models")
os.makedirs(OUT, exist_ok=True)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def pbr(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    node = material.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    if emission:
        node.inputs["Emission Color"].default_value = (*emission, 1)
        node.inputs["Emission Strength"].default_value = strength
    return material


M = {
    "walnut": pbr("Walnut lacquer", (0.09, 0.028, 0.012), 0.05, 0.24),
    "walnut_light": pbr("Walnut edge", (0.25, 0.07, 0.018), 0.08, 0.27),
    "brass": pbr("Brushed brass", (0.64, 0.34, 0.055), 0.88, 0.22),
    "gold": pbr("Polished gold", (0.93, 0.61, 0.12), 0.95, 0.13),
    "chrome": pbr("Chrome", (0.58, 0.64, 0.71), 1.0, 0.12),
    "dark": pbr("Charcoal metal", (0.015, 0.018, 0.027), 0.78, 0.23),
    "black": pbr("Soft black", (0.012, 0.012, 0.016), 0.08, 0.34),
    "felt": pbr("Emerald casino felt", (0.012, 0.17, 0.075), 0.0, 0.84),
    "felt_red": pbr("Roulette felt", (0.07, 0.22, 0.10), 0.0, 0.78),
    "leather": pbr("Oxblood leather", (0.16, 0.013, 0.015), 0.03, 0.43),
    "ivory": pbr("Ivory cards", (0.92, 0.88, 0.76), 0.0, 0.42),
    "red": pbr("Roulette red", (0.52, 0.006, 0.012), 0.08, 0.32),
    "green": pbr("Roulette green", (0.005, 0.24, 0.10), 0.05, 0.36),
    "blue": pbr("Casino blue", (0.008, 0.08, 0.36), 0.25, 0.26),
    "white": pbr("Casino white", (0.82, 0.85, 0.91), 0.1, 0.34),
    "cyan_light": pbr("Cyan neon", (0.02, 0.18, 0.22), 0.05, 0.25, (0.02, 0.8, 1.0), 4.0),
    "pink_light": pbr("Magenta neon", (0.22, 0.01, 0.08), 0.05, 0.25, (1.0, 0.02, 0.20), 4.0),
    "screen": pbr("Screen glow", (0.02, 0.09, 0.13), 0.0, 0.25, (0.04, 0.65, 1.0), 1.8),
}


def link(obj, parent):
    obj.parent = parent
    return obj


def bevel(obj, width=0.025, segments=2):
    mod = obj.modifiers.new("Precision bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    return obj


def cube(name, size, loc, material, parent, rot=None, bevel_width=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    if bevel_width:
        bevel(obj, bevel_width)
    return link(obj, parent)


def cylinder(name, radius, depth, loc, material, parent, vertices=32, rot=None, bevel_width=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    if bevel_width:
        bevel(obj, bevel_width, 2)
    return link(obj, parent)


def sphere(name, radius, loc, material, parent, segments=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(8, segments // 2), radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return link(obj, parent)


def torus(name, major, minor, loc, material, parent, rot=None, major_segments=40):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments, minor_segments=10, location=loc, rotation=rot or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return link(obj, parent)


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def chip(parent, x, y, z, material, count=1):
    for idx in range(count):
        cylinder("Casino chip", 0.052, 0.011, (x, y, z + idx * 0.012), material, parent, 20, bevel_width=0.002)
        torus("Chip inlay", 0.036, 0.003, (x, y, z + idx * 0.018), M["ivory"], parent, major_segments=20)


def stool(parent, x, y):
    cylinder("Stool base", 0.21, 0.035, (x, y, 0.025), M["chrome"], parent, 28, bevel_width=0.008)
    cylinder("Stool column", 0.03, 0.52, (x, y, 0.28), M["chrome"], parent, 14)
    cylinder("Leather seat", 0.23, 0.10, (x, y, 0.59), M["leather"], parent, 28, bevel_width=0.025)
    cube("Stool back", (0.38, 0.06, 0.28), (x, y + 0.18, 0.82), M["leather"], parent, bevel_width=0.035)


def blackjack_table():
    root = empty("BlackjackTable")
    # Carved cabinet, raised arm rail and inset felt.
    cube("Carved walnut pedestal", (3.20, 1.62, 0.72), (0, 0, 0.36), M["walnut"], root, bevel_width=0.10)
    cube("Brass plinth", (3.32, 1.74, 0.10), (0, 0, 0.10), M["brass"], root, bevel_width=0.025)
    for x in (-1.30, 1.30):
        for y in (-0.60, 0.60):
            cylinder("Turned table leg", 0.115, 0.78, (x, y, 0.39), M["walnut_light"], root, 18, bevel_width=0.018)
            torus("Leg brass ring", 0.118, 0.010, (x, y, 0.48), M["brass"], root, major_segments=18)
    cube("Table top", (3.92, 2.22, 0.16), (0, 0, 0.86), M["walnut_light"], root, bevel_width=0.115)
    cube("Inlaid green felt", (3.64, 1.94, 0.035), (0, 0, 0.96), M["felt"], root, bevel_width=0.055)
    # Four independent brass rails produce a sharp casino-table silhouette.
    cube("Gold rail north", (3.54, 0.045, 0.04), (0, -0.91, 1.01), M["gold"], root, bevel_width=0.015)
    cube("Gold rail south", (3.54, 0.045, 0.04), (0, 0.91, 1.01), M["gold"], root, bevel_width=0.015)
    cube("Gold rail west", (0.045, 1.82, 0.04), (-1.75, 0, 1.01), M["gold"], root, bevel_width=0.015)
    cube("Gold rail east", (0.045, 1.82, 0.04), (1.75, 0, 1.01), M["gold"], root, bevel_width=0.015)
    cube("Dealer chip rack", (1.10, 0.24, 0.10), (0, -0.64, 1.04), M["dark"], root, bevel_width=0.03)
    for row, color in enumerate((M["red"], M["blue"], M["green"], M["black"], M["gold"])):
        for col in range(8):
            chip(root, -0.44 + row * 0.22, -0.72 + col * 0.021, 1.10, color)
    # Cards and chips make the model feel used without changing the game state.
    for idx, (x, y, yaw) in enumerate(((-0.48, 0.18, -0.18), (-0.28, 0.23, 0.08), (0.52, 0.22, 0.28), (0.72, 0.16, -0.08))):
        cube("Dealt card", (0.15, 0.22, 0.007), (x, y, 1.02 + idx * 0.004), M["ivory"], root, rot=(0, 0, yaw), bevel_width=0.008)
    chip(root, 0.92, 0.43, 1.03, M["red"], 5)
    chip(root, 1.18, 0.22, 1.03, M["blue"], 4)
    chip(root, 0.65, 0.55, 1.03, M["gold"], 6)
    for x in (-1.35, -0.68, 0, 0.68, 1.35):
        stool(root, x, 1.52)
    return root


def roulette_table():
    root = empty("EuropeanRouletteTable")
    cube("Roulette mahogany pedestal", (4.18, 1.92, 0.70), (0, 0, 0.35), M["walnut"], root, bevel_width=0.13)
    cube("Roulette brass plinth", (4.36, 2.10, 0.10), (0, 0, 0.10), M["brass"], root, bevel_width=0.03)
    cube("Roulette top", (4.60, 2.34, 0.15), (0, 0, 0.86), M["walnut_light"], root, bevel_width=0.13)
    cube("Roulette felt", (4.30, 2.04, 0.035), (0.15, 0, 0.96), M["felt_red"], root, bevel_width=0.06)
    # Realistic wheel: walnut bowl, brass rims, a numbered-pocket colour cadence and ivory ball.
    wx, wy = -1.38, 0.0
    cylinder("Roulette bowl", 0.72, 0.15, (wx, wy, 1.07), M["walnut"], root, 64, bevel_width=0.03)
    cylinder("Roulette wheel", 0.64, 0.085, (wx, wy, 1.18), M["dark"], root, 64, bevel_width=0.018)
    torus("Outer brass wheel rim", 0.68, 0.025, (wx, wy, 1.27), M["gold"], root, major_segments=64)
    torus("Inner brass wheel rim", 0.28, 0.018, (wx, wy, 1.28), M["brass"], root, major_segments=40)
    for pocket in range(37):
        angle = math.tau * pocket / 37
        color = M["green"] if pocket == 0 else (M["red"] if pocket % 2 else M["black"])
        cylinder("Roulette pocket", 0.040, 0.018, (wx + math.cos(angle) * 0.48, wy + math.sin(angle) * 0.48, 1.27), color, root, 12, bevel_width=0.002)
    cylinder("Wheel spindle", 0.075, 0.12, (wx, wy, 1.31), M["gold"], root, 20, bevel_width=0.01)
    sphere("Ivory roulette ball", 0.035, (wx + 0.39, wy + 0.19, 1.32), M["ivory"], root, 14)
    for x in (-0.05, 0.48, 1.03, 1.56):
        chip(root, x, -0.42, 1.03, M["red"], 3)
        chip(root, x + 0.08, -0.21, 1.03, M["blue"], 2)
    cube("Dealer rack", (0.88, 0.22, 0.10), (1.36, -0.73, 1.04), M["dark"], root, bevel_width=0.025)
    for x in (-1.60, -0.80, 0.0, 0.8, 1.60):
        stool(root, x, 1.56)
    return root


def slot_machine():
    root = empty("LuxurySlotMachine")
    # The front faces Blender -Y, which becomes the player's positive-Z side after GLB export.
    cube("Slot pedestal", (1.03, 0.70, 0.16), (0, 0, 0.08), M["brass"], root, bevel_width=0.045)
    cube("Slot cabinet", (0.98, 0.62, 1.48), (0, 0.04, 0.82), M["dark"], root, bevel_width=0.09)
    cube("Slot lacquer side left", (0.06, 0.66, 1.58), (-0.50, 0.03, 0.90), M["blue"], root, bevel_width=0.025)
    cube("Slot lacquer side right", (0.06, 0.66, 1.58), (0.50, 0.03, 0.90), M["blue"], root, bevel_width=0.025)
    cube("Slot marquee", (0.88, 0.18, 0.30), (0, -0.23, 1.82), M["pink_light"], root, bevel_width=0.05)
    cube("Slot crown", (0.75, 0.20, 0.15), (0, 0.04, 2.00), M["brass"], root, bevel_width=0.05)
    cube("Screen bezel", (0.81, 0.08, 0.66), (0, -0.34, 1.40), M["black"], root, bevel_width=0.035)
    cube("Screen glow", (0.67, 0.018, 0.49), (0, -0.389, 1.41), M["screen"], root, bevel_width=0.018)
    # Three physical reel windows, a chrome divider and jewel-like buttons.
    for x in (-0.22, 0.0, 0.22):
        cube("Reel window", (0.17, 0.012, 0.32), (x, -0.404, 1.41), M["ivory"], root, bevel_width=0.012)
    for x in (-0.11, 0.11):
        cube("Reel divider", (0.026, 0.025, 0.39), (x, -0.415, 1.41), M["chrome"], root, bevel_width=0.006)
    cube("Control deck", (0.88, 0.42, 0.09), (0, -0.40, 0.98), M["walnut_light"], root, rot=(math.radians(16), 0, 0), bevel_width=0.035)
    for x, material, radius in ((-0.24, M["cyan_light"], 0.042), (0.0, M["gold"], 0.060), (0.24, M["pink_light"], 0.042)):
        cylinder("Illuminated slot button", radius, 0.035, (x, -0.53, 1.05), material, root, 20, rot=(math.pi / 2, 0, 0), bevel_width=0.005)
    cube("Cash tray", (0.52, 0.10, 0.10), (0, -0.36, 0.62), M["chrome"], root, bevel_width=0.025)
    cube("Bill acceptor", (0.15, 0.035, 0.10), (0.29, -0.36, 0.78), M["black"], root, bevel_width=0.008)
    for x, material in ((-0.47, M["cyan_light"]), (0.47, M["pink_light"])):
        cube("Animated light strip", (0.035, 0.045, 1.58), (x, -0.31, 1.03), material, root, bevel_width=0.012)
    for z in (0.35, 1.55):
        torus("Chrome cabinet accent", 0.44, 0.010, (0, -0.325, z), M["chrome"], root, rot=(math.pi / 2, 0, 0), major_segments=32)
    stool(root, 0, -1.04)
    return root


def select_tree(root):
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def export(root, filename):
    select_tree(root)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, filename),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_normals=True,
        export_yup=True,
        export_lights=False,
        export_cameras=False,
        export_animations=False,
    )


def add_presentation_camera():
    bpy.ops.object.camera_add(location=(8, -10, 7), rotation=(math.radians(67), 0, math.radians(38)))
    camera = bpy.context.object
    camera.name = "Presentation Camera"
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(3, -2, 7))
    bpy.context.object.data.energy = 900
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 5
    bpy.ops.object.light_add(type="AREA", location=(-4, 3, 4))
    bpy.context.object.data.energy = 600
    bpy.context.object.data.color = (1.0, 0.42, 0.16)
    bpy.context.object.data.size = 4


reset_scene()
blackjack = blackjack_table()
roulette = roulette_table()
slot = slot_machine()
# Keep every source asset in one .blend, but export each prop independently for streaming.
blackjack.location.x = -7
roulette.location.x = 0
slot.location.x = 7
add_presentation_camera()
bpy.context.scene.render.engine = "BLENDER_EEVEE"
bpy.context.scene.render.resolution_x = 1280
bpy.context.scene.render.resolution_y = 720
bpy.context.scene.render.resolution_percentage = 50
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "casino_props.blend"))

# Export from origin so the Three.js placement matches the shared world coordinates.
for root, filename in ((blackjack, "blackjack_table.glb"), (roulette, "roulette_table.glb"), (slot, "luxury_slot_machine.glb")):
    original_x = root.location.x
    root.location.x = 0
    export(root, filename)
    root.location.x = original_x

print("Created Blender source and GLB assets in", OUT)
