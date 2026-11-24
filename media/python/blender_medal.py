"""Export an original medal model for the Three.js preview."""

from argparse import ArgumentParser
from math import pi
from pathlib import Path
import sys

import bpy


def material(name, color, metallic):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = 0.3
    return result


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    output = parser.parse_args(arguments).output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    blue = material("Blue steel", (0.035, 0.115, 0.215), 0.28)
    silver = material("Silver rim", (0.52, 0.68, 0.79), 0.25)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.21, depth=0.23, rotation=(pi / 2, 0, 0))
    disk = bpy.context.object
    disk.name = "Medal"
    disk.data.materials.append(blue)
    bevel = disk.modifiers.new("Beveled edge", "BEVEL")
    bevel.width = 0.04
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(
            major_segments=64, minor_segments=12, major_radius=1.04, minor_radius=0.043,
            location=(0, side * 0.12, 0), rotation=(pi / 2, 0, 0),
        )
        rim = bpy.context.object
        rim.data.materials.append(silver)
        for face in rim.data.polygons:
            face.use_smooth = True
    bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB")


if __name__ == "__main__":
    main()
