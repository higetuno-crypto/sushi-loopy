"""Run in Blender. Package the approved .blend files without changing their geometry."""
import bpy
import io_scene_gltf2
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
output = repo / 'public/assets/models/01-craftsman'
output.mkdir(parents=True, exist_ok=True)
previous_scene = bpy.context.window.scene
temporary = bpy.data.scenes.new('Craftsman_Runtime_Export')
try:
    bpy.context.window.scene = temporary
    for level in range(1, 5):
        source = repo / f'assets/models/01-craftsman/lv{level}/craftsman-lv{level}.blend'
        with bpy.data.libraries.load(str(source), link=False) as (src, dst):
            dst.collections = [f'SL_L{level}_MODEL']
        collection = dst.collections[0]
        temporary.collection.children.link(collection)
        bpy.context.view_layer.update()
        meshes = [o for o in collection.objects if o.type == 'MESH']
        palette = list(dict.fromkeys(o.data.materials[p.material_index] for o in meshes for p in o.data.polygons))
        # Only the fabric changes color in-game; the red roof, seats and sushi stay red.
        fabric = next(m for m in palette if 'Vermilion' in m.name).copy()
        fabric.name = 'Craftsman_Noren'
        palette.append(fabric)
        vertices, faces, colors = [], [], []
        for obj in meshes:
            assert not obj.modifiers, obj.name
            obj.data.calc_loop_triangles()
            offset = len(vertices)
            vertices.extend(tuple(obj.matrix_world @ v.co) for v in obj.data.vertices)
            for triangle in obj.data.loop_triangles:
                faces.append(tuple(offset+i for i in triangle.vertices))
                mat = obj.data.materials[obj.data.polygons[triangle.polygon_index].material_index]
                if 'Noren' in obj.name and 'Vermilion' in mat.name:
                    mat = fabric
                colors.append(palette.index(mat))
        mesh = bpy.data.meshes.new('Craftsman_Runtime')
        mesh.from_pydata(vertices, [], faces)
        for mat in palette:
            mesh.materials.append(mat)
        for face, color in zip(mesh.polygons, colors):
            face.material_index = color
        packed = bpy.data.objects.new(f'Craftsman_L{level}', mesh)
        temporary.collection.objects.link(packed)
        for obj in bpy.context.selected_objects:
            obj.select_set(False)
        packed.select_set(True)
        bpy.context.view_layer.objects.active = packed
        binary_format = next(i[0] for i in io_scene_gltf2.get_format_items(temporary, bpy.context) if i[0] == 'GLB')
        path = output / f'craftsman-lv{level}.glb'
        bpy.ops.export_scene.gltf(filepath=str(path), export_format=binary_format,
            use_selection=True, use_active_scene=True, export_yup=True, export_animations=False,
            export_cameras=False, export_lights=False, export_texcoords=False, export_normals=True)
        print(f'Lv.{level}: {len(faces)} tris, {len(palette)} materials, {path.stat().st_size} bytes')
        bpy.data.objects.remove(packed, do_unlink=True)
        bpy.data.meshes.remove(mesh)
        # Only remove data appended by this iteration, never the open approved scenes.
        for obj in list(collection.objects):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(collection)
        for mat in palette:
            if mat.users == 0:
                bpy.data.materials.remove(mat)
finally:
    bpy.context.window.scene = previous_scene
    bpy.data.scenes.remove(temporary)
