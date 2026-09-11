"""Run only in a separate Blender --background --factory-startup process.
No network, addons, downloads, or changes to the user's working scene.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'prototypes' / 'sync-device-v1'
OUT.mkdir(parents=True, exist_ok=True)
if (OUT / 'sync-device.blend').exists():
    raise RuntimeError('Prototype exists; choose a new version before regenerating.')

# This scene belongs only to the isolated factory-startup process.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = 0.38
    return mat

ivory = material('Ceramic ivory', (0.74, 0.72, 0.60))
ink = material('Indigo alloy', (0.025, 0.085, 0.12), 0.6)
coral = material('Salmon calibration marks', (0.76, 0.17, 0.10))
green = material('Impossible freshness', (0.28, 0.8, 0.59), 0.2)
core = green.node_tree.nodes.get('Principled BSDF')
core.inputs['Emission Color'].default_value = (0.08, 0.6, 0.3, 1)
core.inputs['Emission Strength'].default_value = 0.7

def attach(name, mat):
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.15, depth=0.18, location=(0, 0, 0.0))
attach('Ceramic plate base', ivory)
bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.88, depth=0.20, location=(0, 0, 0.15))
attach('Synchronizer pedestal', ink)
for index, rotation in enumerate([(math.pi/2, 0, 0), (0, math.pi/2, math.pi/5), (0, 0, 0)]):
    bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8, location=(0, 0, 1.12),
        rotation=rotation, major_radius=0.86 + index*0.09, minor_radius=0.045)
    attach(f'Freshness orbit {index+1}', ink if index != 1 else coral)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.48, location=(0, 0, 1.12))
attach('Freshness core', green)
for index in range(8):
    angle = index * math.tau / 8
    bpy.ops.mesh.primitive_cube_add(size=0.075, location=(math.cos(angle), math.sin(angle), 0.12))
    attach(f'Calibration marker {index+1}', coral)

meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
triangles = 0
for obj in meshes:
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(filepath=str(OUT / 'sync-device.glb'), export_format='GLB', use_selection=True)

bpy.ops.object.camera_add(location=(3.6, -5, 3.4))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0.95)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.3
bpy.context.scene.camera = camera
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.color_type = 'MATERIAL'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.render.filepath = str(OUT / 'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'sync-device.blend'))
bpy.ops.render.render(write_still=True)
manifest = {'generator': 'Blender Python, isolated factory startup', 'blender_version': bpy.app.version_string,
    'triangles': triangles, 'mesh_objects': len(meshes), 'glb_bytes': (OUT/'sync-device.glb').stat().st_size,
    'runtime_adoption': False, 'purpose': 'Future global_freshness_sync concept, not final art'}
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(manifest))
