"""Render preview images of the hair with Blender (Cycles), on a plain grey
classic Roblox head.

The script imports messy_hair.obj + .mtl + texture exactly like Roblox Studio
receives them, so a broken file shows up here too.

Run:  pip install bpy pillow && python render_previews.py [--size 840] [--samples 128]
      [--views front,threequarter,side,back,top] [--out DIR] [--background none|#rrggbb]
      [--backfaces]

--backfaces paints every back-facing surface red: Roblox doesn't draw back
faces, so any red in that render would be a hole in the hair in game.
"""

import argparse
import math
import os

import bpy
from mathutils import Vector
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = "messy_hair"

# Camera azimuth (degrees, + turns towards the avatar's right = +X) and elevation.
VIEWS = {
    "front": (0.0, 10.0),
    "threequarter": (38.0, 14.0),
    "side": (90.0, 8.0),
    "back": (180.0, 12.0),
    "top": (20.0, 55.0),
}


def rb(x, y, z):
    """Roblox / OBJ coordinates (Y up, front -Z) -> Blender (Z up)."""
    return Vector((x, -z, y))


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def backface_red(mat):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    out = nodes["Material Output"]
    shader = out.inputs["Surface"].links[0].from_node
    geo = nodes.new("ShaderNodeNewGeometry")
    red = nodes.new("ShaderNodeEmission")
    red.inputs["Color"].default_value = (1.0, 0.0, 0.0, 1.0)
    red.inputs["Strength"].default_value = 3.0
    mix = nodes.new("ShaderNodeMixShader")
    links.new(geo.outputs["Backfacing"], mix.inputs["Fac"])
    links.new(shader.outputs[0], mix.inputs[1])
    links.new(red.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs["Surface"])


def build_scene(samples, backfaces):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = samples
    scn.cycles.use_denoising = True
    scn.render.film_transparent = True
    scn.view_settings.view_transform = "Standard"

    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.75, 0.77, 0.8, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.3
    scn.world = world

    bpy.ops.wm.obj_import(filepath=os.path.join(HERE, f"{NAME}.obj"), forward_axis="NEGATIVE_Z", up_axis="Y")
    hair = bpy.context.selected_objects[0]
    for mat in hair.data.materials:
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Roughness"].default_value = 0.55
            bsdf.inputs["Specular IOR Level"].default_value = 0.3
        if backfaces:
            backface_red(mat)

    # Classic head: rounded cylinder 1.2 x 1.2 x 1.2 studs at the origin.
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.6, depth=1.2)
    head = bpy.context.active_object
    bev = head.modifiers.new("round", "BEVEL")
    bev.width, bev.segments, bev.limit_method = 0.22, 10, "ANGLE"
    bpy.ops.object.shade_smooth()
    head.data.materials.append(material("head", (0.42, 0.42, 0.42), 0.7))

    def light(name, kind, loc, energy, size):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        if kind == "AREA":
            data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0.2)) - obj.location).to_track_quat("-Z", "Y").to_euler()
        scn.collection.objects.link(obj)

    light("key", "AREA", rb(3.2, 3.6, -3.0), 190, 3.0)
    light("fill", "AREA", rb(-3.4, 1.0, -2.6), 60, 4.0)
    light("rim", "AREA", rb(0.5, 3.2, 3.6), 120, 3.0)
    return scn, hair


def render(scn, view, size, out_dir, tag=""):
    az, el = (math.radians(a) for a in VIEWS[view])
    target = rb(0.0, 0.12, 0.0)
    dist = 5.0
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 70
    cam = bpy.data.objects.new("cam", cam_data)
    scn.collection.objects.link(cam)
    cam.location = target + dist * rb(math.sin(az) * math.cos(el), math.sin(el), -math.cos(az) * math.cos(el))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scn.camera = cam
    scn.render.resolution_x = scn.render.resolution_y = size
    scn.render.filepath = os.path.join(out_dir, f"preview_{view}{tag}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    return scn.render.filepath


def flatten(path, color):
    """Put the transparent render on a solid background (white hair would
    vanish on a white page)."""
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, color)
    Image.alpha_composite(bg, im).convert("RGB").save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=840)
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--views", default="front,threequarter,side,back")
    ap.add_argument("--out", default=HERE)
    ap.add_argument("--background", default="#2c3038", help="'none' keeps the alpha channel")
    ap.add_argument("--backfaces", action="store_true")
    args = ap.parse_args()

    scn, hair = build_scene(args.samples, args.backfaces)
    verts = [hair.matrix_world @ v.co for v in hair.data.vertices]
    lo = Vector(min(p[i] for p in verts) for i in range(3))
    hi = Vector(max(p[i] for p in verts) for i in range(3))
    print(f"imported {hair.name}: {len(hair.data.polygons)} faces, bbox (Blender axes) {lo} .. {hi}")
    for view in args.views.split(","):
        path = render(scn, view, args.size, args.out, "_backfaces" if args.backfaces else "")
        if args.background != "none":
            flatten(path, args.background)
        print("wrote", path)


if __name__ == "__main__":
    main()
