"""Run through Blender MCP. Build one numbered level in a new scene, then inspect it.
LEVEL=1..4; FINAL=True writes the reviewed .blend, runtime GLB and four renders.
Reuses its own level scene and leaves other scenes untouched. FINAL rewrites that level's outputs.
"""
import bpy
import bmesh
import math
import json
import io_scene_gltf2
from pathlib import Path
from mathutils import Vector

REPO = Path(__file__).resolve().parents[1]
LEVEL = globals().get('LEVEL', 1)
FINAL = globals().get('FINAL', False)
OUT = REPO / f'assets/models/02-conveyor-sushi/lv{LEVEL}'
OUT.mkdir(parents=True, exist_ok=True)
scene_name = f'SL_02_Conveyor_L{LEVEL}_v01'
scene = bpy.data.scenes.get(scene_name)

if not scene:
    scene = bpy.data.scenes.new(scene_name)
    bpy.context.window.scene = scene
    model = bpy.data.collections.new(f'Conveyor_L{LEVEL}_MODEL')
    rig = bpy.data.collections.new(f'Conveyor_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model)
    scene.collection.children.link(rig)
    root = bpy.data.objects.new(f'Conveyor_L{LEVEL}_ROOT', None)
    model.objects.link(root)
    root['facility_id'] = 'conveyor_sushi'
    root['level'] = LEVEL
    palette = [('Stone',(.38,.40,.35)),('Timber',(.24,.105,.040)),
        ('Honey_wood',(.54,.29,.105)),('Indigo_roof',(.025,.062,.091)),
        ('Vermilion',(.58,.065,.028)),('Paper',(.92,.75,.40)),
        ('Gold',(.65,.34,.055)),('Conveyor_Noren',(.58,.065,.028))]
    mats=[]
    for name,color in palette:
        mat=bpy.data.materials.new(name if name=='Conveyor_Noren' else f'C{LEVEL}_{name}')
        mat.use_nodes=True; mat.diffuse_color=(*color,1)
        bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.34 if name=='Gold' else .78
        bsdf.inputs['Metallic'].default_value=.45 if name=='Gold' else 0
        mats.append(mat)

    class Part:
        def __init__(self,name):
            self.name=name; self.verts=[]; self.faces=[]; self.colors=[]
        def poly(self,vertices,faces,color):
            offset=len(self.verts); self.verts.extend(vertices)
            self.faces.extend(tuple(offset+i for i in f) for f in faces)
            self.colors.extend([color]*len(faces))
        def box(self,center,size,color):
            x,y,z=center; a,b,c=(v/2 for v in size)
            self.poly([(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
                (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)],
                [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color)
        def extrude(self,x0,x1,yz,color):
            n=len(yz)
            self.poly([(x,y,z) for x in (x0,x1) for y,z in yz],
                [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+
                [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],color)
        def loft(self,x,y,rings,color,sides=12):
            self.poly([(x+rx*math.cos(i*math.tau/sides),y+ry*math.sin(i*math.tau/sides),z)
                for z,rx,ry in rings for i in range(sides)],
                [tuple(range(sides-1,-1,-1)),tuple(range((len(rings)-1)*sides,len(rings)*sides))]+
                [(r*sides+i,r*sides+(i+1)%sides,(r+1)*sides+(i+1)%sides,(r+1)*sides+i)
                 for r in range(len(rings)-1) for i in range(sides)],color)
        def cylinder(self,center,radius,height,color,sides=12):
            x,y,z=center; self.loft(x,y,[(z-height/2,radius,radius),(z+height/2,radius,radius)],color,sides)
        def ring(self,center,outer,inner,height,color,sides=40):
            x,y,z=center
            self.poly([(x+rx*math.cos(i*math.tau/sides),y+ry*math.sin(i*math.tau/sides),zz)
                for zz,rx,ry in [(z-height/2,*outer),(z-height/2,*inner),(z+height/2,*inner),(z+height/2,*outer)] for i in range(sides)],
                [(r*sides+i,r*sides+(i+1)%sides,((r+1)%4)*sides+(i+1)%sides,((r+1)%4)*sides+i)
                 for r in range(4) for i in range(sides)],color)
        def finish(self,bevel=0):
            mesh=bpy.data.meshes.new(self.name); mesh.from_pydata(self.verts,[],self.faces)
            used=sorted(set(self.colors))
            for i in used: mesh.materials.append(mats[i])
            for face,color in zip(mesh.polygons,self.colors): face.material_index=used.index(color)
            bm=bmesh.new(); bm.from_mesh(mesh)
            if bevel: bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=1,affect='EDGES',clamp_overlap=True)
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free(); mesh.update()
            obj=bpy.data.objects.new(self.name,mesh); model.objects.link(obj); obj.parent=root
            return obj

    def roof(name,width,cy,depth,eave,rise):
        # One closed shell with raised tile courses united into it: no buried tile faces.
        top=lambda y:eave+rise*(1-abs(y-cy)/(depth/2))
        p=Part(name)
        p.extrude(-width/2,width/2,[(cy-depth/2,eave),(cy,eave+rise),(cy+depth/2,eave),
            (cy+depth/2,eave-.12),(cy,eave+rise-.12),(cy-depth/2,eave-.12)],3)
        shell=p.finish()
        p=Part(name+'_Tiles')
        for side in (-1,1):
            for row in range(3):
                a=cy+side*(row*depth/6+.012); b=cy+side*((row+1)*depth/6-.012)
                for column in range(8):
                    x0=-width/2+column*width/8+.012; x1=-width/2+(column+1)*width/8-.012
                    p.extrude(x0,x1,[(a,top(a)-.006),(b,top(b)-.006),(b,top(b)+.045),(a,top(a)+.012)],3)
        tile=p.finish()
        kind=next(i.identifier for i in bpy.types.Modifier.bl_rna.properties['type'].enum_items if i.identifier=='BOOLEAN')
        modifier=shell.modifiers.new('Joined tile relief',kind); modifier.object=tile
        modifier.operation=next(i.identifier for i in modifier.bl_rna.properties['operation'].enum_items if i.identifier=='UNION')
        with bpy.context.temp_override(object=shell,active_object=shell): bpy.ops.object.modifier_apply(modifier=modifier.name)
        data=tile.data; bpy.data.objects.remove(tile,do_unlink=True); bpy.data.meshes.remove(data)
        p=Part(name+'_Trim')
        p.box((0,cy,eave+rise+.025),(width+.04,.13,.13),4)
        for side in (-1,1):
            p.box((0,cy+side*depth/2,eave-.09),(width+.04,.10,.13),4)
        p.finish()
        return top

    def lantern(p,x,y,z,red=False):
        p.loft(x,y,[(z-.22,.095,.095),(z-.15,.145,.145),(z+.15,.145,.145),(z+.22,.095,.095)],4 if red else 5,10)
        for dz in (-.22,.22): p.cylinder((x,y,z+dz),.104,.045,6 if LEVEL==4 else 1,10)
        p.cylinder((x,y,z+.29),.018,.10,1,6)

    w,d=[(4.8,5.0),(5.0,5.1),(5.4,5.3),(5.7,5.6)][LEVEL-1]
    p=Part('Foundation'); p.box((0,0,.10),(w,d,.20),0); p.finish(.035)
    back=1.45 if LEVEL<3 else 1.85
    half=1.72 if LEVEL<3 else 1.92
    p=Part('Kitchen_Frame')
    for x in (-half,half):
        for y in (.20,back): p.box((x,y,1.34),(.17,.17,2.28),1)
    for y in (.20,back): p.box((0,y,2.40),(2*half+.16,.17,.14),1)
    p.finish()
    p=Part('Kitchen_Walls')
    for x in (-half,half): p.box((x,(.28+back)/2,1.28),(.11,back-.28,2.16),2)
    # A proper rear door opening; the leaf sits inside it, with a visible frame and handle.
    for x,width in [((-half+.30)/2,half+.30),((1.02+half)/2,half-1.02)]: p.box((x,back,1.30),(width,.12,2.20),2)
    p.box((.66,back,2.25),(.72,.12,.30),2); p.finish()
    p=Part('Rear_Service_Door'); p.box((.66,back+.005,1.13),(.69,.085,1.86),1)
    for x in (.285,1.035): p.box((x,back+.075,1.17),(.05,.04,1.94),2)
    p.box((.88,back+.066,1.12),(.035,.05,.16),6 if LEVEL>1 else 0); p.finish()
    p=Part('Shoji_And_Joinery')
    for x in (-half-.061,half+.061):
        p.box((x,(.3+back)/2,1.55),(.025,.76,.64),5)
        for y in ((.3+back)/2-.4,(.3+back)/2,(.3+back)/2+.4): p.box((x*1.005,y,1.55),(.04,.032,.72),1)
        for z in (1.2,1.55,1.9): p.box((x*1.005,(.3+back)/2,z),(.04,.85,.035),1)
    p.finish()
    p=Part('Tea_Shelf')
    p.box((-.50,back-.12,1.22),(1.75,.12,1.68),1)
    for z in (.44,1.0,1.56,2.05): p.box((-.50,back-.33,z),(1.82,.43,.065),2)
    for x in (-1.1,-.65,-.2,.25):
        for z in (1.11,1.68): p.cylinder((x,back-.34,z),.095,.15,5,8)
    p.finish()
    main_depth=1.85 if LEVEL<3 else 2.30
    main_cy=.92 if LEVEL<3 else 1.08
    roof_top=roof('Main_Roof',3.96 if LEVEL<3 else 4.48,main_cy,main_depth,2.44,.52 if LEVEL<3 else .70)
    p=Part('Noren')
    for x in (-1.2,-.6,0,.6,1.2): p.box((x,.145,2.20),(.56,.03,.32),7)
    p.finish()
    p=Part('Counter_Joinery')
    # Hollow counter ring: outer skirt and inner well keep the conveyor structurally credible.
    p.ring((0,-.93,.62),(2.03,.98),(1.16,.19),.84,2)
    p.ring((0,-.93,1.07),(2.06,1.01),(1.13,.16),.10,2)
    p.finish()
    p=Part('Conveyor_Belt'); p.ring((0,-.93,1.14),(1.91,.88),(1.41,.38),.04,3); p.finish()
    p=Part('Conveyor_Guides')
    for outer,inner in [((1.96,.93),(1.92,.89)),((1.40,.37),(1.36,.33))]: p.ring((0,-.93,1.16),outer,inner,.045,6 if LEVEL>=3 else 0)
    p.finish()
    p=Part('Counter_Panels')
    for x in (-1.28,-.64,0,.64,1.28):
        y=-.93-.98*math.sqrt(1-(x/2.03)**2)
        p.box((x,y-.008,.65),(.035,.024,.62),1)
    p.finish()
    seat_x=(-1.12,0,1.12) if LEVEL<3 else (-1.26,-.42,.42,1.26)
    p=Part('Guest_Seats')
    for x in seat_x:
        y=-2.23
        p.cylinder((x,y,.61),.235,.105,4,12)
        for dx in (-.13,.13):
            for dy in (-.12,.12): p.box((x+dx,y+dy,.39),(.06,.06,.38),1)
        if LEVEL>=3: p.ring((x,y,.575),(.245,.245),(.218,.218),.035,6,12)
    p.finish()
    p=Part('Lanterns')
    for x in (-half,half): lantern(p,x,-.02,2.10)
    if LEVEL>=2:
        for x in (-.9,.9): lantern(p,x,-.02,2.10,True)
    p.finish()
    if LEVEL>=2:
        p=Part('Welcome_Step'); p.box((2.13,-.07,.28),(.44,.8,.16),2); p.finish(.018)
        p=Part('Plate_Return_Cabinet'); p.box((2.06,.52,.63),(.48,.61,.86),2)
        p.box((2.06,.205,.81),(.34,.02,.095),3)
        for i in range(3): p.cylinder((2.06,.52,1.09+i*.037),.18,.03,5,12)
        p.finish()
    if LEVEL>=3:
        p=Part('Festival_Finials')
        for x in (-2.18,2.18):
            p.cylinder((x,main_cy,3.24),.07,.21,6,8)
            p.loft(x,main_cy,[(3.30,.12,.09),(3.44,.055,.055),(3.48,.02,.02)],6,8)
        p.finish()
        p=Part('Festival_Banners')
        for x in ((-2.48,) if LEVEL==3 else (-2.55,2.55)):
            p.cylinder((x,.60,1.47),.025,2.54,1,8)
            p.cylinder((x,.60,.27),.12,.14,0,10)
            p.box((x+.10,.60,2.13),(.27,.03,.87),4)
            p.box((x+.10,.578,1.72),(.27,.013,.035),6)
            p.box((x+.10,.58,2.18),(.14,.016,.10),5)
            p.box((x+.10,.58,2.26),(.17,.016,.055),6)
        p.finish()
        p=Part('Rear_Pantry'); p.box((-1.02,back+.17,.76),(.85,.22,1.12),1)
        for z in (.34,.9,1.29): p.box((-1.02,back+.32,z),(.94,.12,.045),2)
        p.finish()
    if LEVEL==4:
        p=Part('Upper_Pavilion_Supports')
        for x in (-.77,.77):
            for y in (main_cy-.34,main_cy+.34):
                base=roof_top(y)
                p.box((x,y,(base+3.65)/2),(.09,.09,3.65-base),1)
                p.box((x,y,3.60),(.15,.15,.055),6)
        p.finish()
        roof('Crown_Canopy',2.18,main_cy,1.24,3.65,.30)
        p=Part('Gold_Eaves')
        for y in (main_cy-main_depth/2,main_cy+main_depth/2): p.box((0,y-.055,2.40),(4.46,.024,.045),6)
        for y in (main_cy-.62,main_cy+.62): p.box((0,y-.055,3.61),(2.18,.024,.045),6)
        p.finish()
        p=Part('Crown_Axle'); p.cylinder((0,main_cy,4.10),.075,.31,6,12); p.finish()
        p=Part('Crown_Carousel')
        p.ring((0,0,0),(.82,.82),(.71,.71),.055,6,32)
        for a in (0,math.tau/3,2*math.tau/3):
            # Three radial spokes physically carry the miniature sushi dishes.
            dx,dy=math.cos(a),math.sin(a)
            corners=[(r*dx+s*dy,r*dy-s*dx,z) for z in (-.025,.025) for r,s in [(0,-.04),(.77,-.04),(.77,.04),(0,.04)]]
            p.poly(corners,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],6)
            x,y=dx*.64,dy*.64
            p.cylinder((x,y,.04),.19,.055,6,12)
            p.box((x,y,.115),(.28,.15,.095),5); p.box((x,y,.19),(.32,.18,.07),4)
        crown=p.finish(); crown.location=(0,main_cy,4.23); crown['motion']='rotate_y'
    # One reusable plate prototype; Blender preview copies are excluded from GLB packaging.
    p=Part('Conveyor_Plate')
    p.cylinder((0,0,.025),.205,.05,6 if LEVEL==4 else 5,12)
    p.box((0,0,.094),(.255,.15,.09),5); p.box((0,0,.160),(.29,.18,.065),4)
    for x in (-.09,0,.09): p.box((x,0,.195),(.024,.174,.008),5)
    # At phone scale the dish is only a few pixels wide; keep its beveled building, not 6-9 beveled copies of every grain.
    plate=p.finish(); plate.hide_render=True; plate.hide_set(True)
    for i in range(5+LEVEL):
        obj=plate.copy(); obj.name=f'Preview_Plate_{i:02}'; model.objects.link(obj)
        a=i*math.tau/(5+LEVEL); obj.location=(math.cos(a)*1.66,-.93+math.sin(a)*.63,1.162)
        obj.rotation_euler.z=a; obj.hide_render=False; obj.hide_set(False)
    # A small ship's wheel badge is legible without any floating words or speech bubbles.
    p=Part('Wheel_Badge'); p.cylinder((0,.11,1.96),.14,.04,6 if LEVEL>=3 else 5,12)
    badge=p.finish();
    for vertex in badge.data.vertices:
        y,z=vertex.co.y,vertex.co.z; vertex.co.y=.11-(z-1.96); vertex.co.z=1.96+(y-.11)

    world=bpy.data.worlds.new(f'C{LEVEL}_World'); world.use_nodes=True
    background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND')
    background.inputs['Color'].default_value=(.7,.77,.84,1); background.inputs['Strength'].default_value=.4; scene.world=world
    camera_data=bpy.data.cameras.new('Preview_Camera'); camera_data.type=next(i.identifier for i in camera_data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); camera_data.ortho_scale=8.8
    camera=bpy.data.objects.new('Preview_Camera',camera_data); rig.objects.link(camera); scene.camera=camera
    for name,loc,energy,size in [('Key',(-3,-4,7),650,5),('Fill',(4,-1,5),350,4),('Rim',(1,4,6),600,3)]:
        light_data=bpy.data.lights.new(name,next(i.identifier for i in bpy.types.Light.bl_rna.properties['type'].enum_items if i.identifier=='AREA'))
        light_data.energy=energy; light_data.size=size
        light=bpy.data.objects.new(name,light_data); rig.objects.link(light); light.location=loc
        light.rotation_euler=(Vector((0,0,1.5))-light.location).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format=next(i.identifier for i in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
    scene.render.image_settings.color_mode=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['color_mode'].enum_items if i.identifier=='RGBA')

bpy.context.window.scene=scene
model=next(c for c in scene.collection.children if c.name.endswith('_MODEL'))
camera=scene.camera
camera.location=(6,-8,6)
camera.rotation_euler=(Vector((0,0,1.6))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.context.view_layer.update()
meshes=[o for o in model.objects if o.type=='MESH' and not o.name.startswith('Preview_')]
checks=[]
for obj in meshes:
    obj.data.calc_loop_triangles(); bm=bmesh.new(); bm.from_mesh(obj.data)
    check={'name':obj.name,'tris':len(obj.data.loop_triangles),'non_manifold':sum(not e.is_manifold for e in bm.edges),
        'zero_area':sum(f.calc_area()<1e-10 for f in bm.faces),'loose_vertices':sum(not v.link_faces for v in bm.verts),'volume':bm.calc_volume(signed=True)}
    bm.free(); assert not any(check[k] for k in ('non_manifold','zero_area','loose_vertices')) and check['volume']>0,check
    checks.append(check)
plate_tris=next(c['tris'] for c in checks if c['name'].startswith('Conveyor_Plate'))
stats={'level':LEVEL,'triangles':sum(c['tris'] for c in checks),'objects':len(meshes),'checks':checks}
stats['visible_triangles']=stats['triangles']+(4+LEVEL)*plate_tris
assert stats['visible_triangles']<=[5000,6000,7500,9500][LEVEL-1],stats['visible_triangles']
(OUT/'checks.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
scene.render.filepath=str(OUT/'front-3q.png'); bpy.ops.render.render(write_still=True)
bpy.data.libraries.write(str(OUT/'conveyor-working.blend'),{scene},fake_user=True)
print(json.dumps({k:v for k,v in stats.items() if k!='checks'}))

if FINAL:
    for name,location in [('back-3q',(-6,8,6)),('side',(8,0,3.7)),('top',(0,0,11))]:
        camera.location=location; camera.rotation_euler=(Vector((0,0,1.6))-camera.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
    camera.location=(6,-8,6); camera.rotation_euler=(Vector((0,0,1.6))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.libraries.write(str(OUT/f'conveyor-lv{LEVEL}.blend'),{scene},fake_user=True)
    # Keep only the two animated semantic parts separate; merge everything else by palette.
    dynamic=[o for o in meshes if o.name.startswith(('Conveyor_Plate','Crown_Carousel'))]
    static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[p.material_index] for o in static for p in o.data.polygons))
    vertices=[]; faces=[]; colors=[]
    for obj in static:
        offset=len(vertices); vertices.extend(tuple(obj.matrix_world@v.co) for v in obj.data.vertices)
        for triangle in obj.data.loop_triangles:
            faces.append(tuple(offset+i for i in triangle.vertices))
            colors.append(materials.index(obj.data.materials[obj.data.polygons[triangle.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Conveyor_Packed'); mesh.from_pydata(vertices,[],faces)
    for mat in materials: mesh.materials.append(mat)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Conveyor_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for obj in bpy.context.selected_objects: obj.select_set(False)
    packed.select_set(True)
    for obj in dynamic: obj.hide_set(False); obj.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/02-conveyor-sushi'; output.mkdir(parents=True,exist_ok=True)
    binary_format=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'conveyor-lv{LEVEL}.glb'),export_format=binary_format,
        use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,
        export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
    for obj in dynamic:
        if obj.name.startswith('Conveyor_Plate'): obj.hide_set(True)
