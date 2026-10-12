"""Blender MCP authoring: LEVEL=1..4; FINAL=True saves the blend, GLB, four views and checks.
Only creates its own named scene. Existing scenes are reused; output files for that level are rewritten.
"""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part as MeshPart
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
OUT=REPO/f'assets/models/03-auto-sushi-machine/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_03_Auto_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Auto_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Auto_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Auto_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='auto_sushi_machine'; root['level']=LEVEL
    palette=[('Stone',(.38,.40,.35)),('Navy',(.035,.105,.175)),('Porcelain',(.82,.77,.61)),
             ('Steel',(.17,.23,.24)),('Gold',(.73,.38,.075)),('Salmon',(.71,.10,.035)),
             ('Rice',(.97,.87,.64)),('Aqua',(.12,.55,.60)),('Amber',(.98,.37,.035))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'A{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.38 if name in ('Gold','Steel','Aqua') else .76
        bsdf.inputs['Metallic'].default_value=.55 if name=='Gold' else .25 if name=='Steel' else 0
        if name=='Amber': bsdf.inputs['Emission Color'].default_value=(*color,1); bsdf.inputs['Emission Strength'].default_value=.35
        mats.append(m)
    def part(name,parent=root): return MeshPart(name,mats,model,parent)
    def empty(name,location,parent=root,angle=0):
        o=bpy.data.objects.new(name,None); model.objects.link(o); o.parent=parent; o.location=location; o.rotation_euler.y=angle; return o
    def beam(p,a,b,width,depth,color):
        a,b=Vector(a),Vector(b); direction=b-a; q=Vector((0,0,1)).rotation_difference(direction.normalized())
        start=len(p.verts); p.box((0,0,0),(width,depth,direction.length),color)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def pipe(p,a,b,radius,color,sides=10):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized())
        start=len(p.verts); p.cylinder((0,0,0),radius,(b-a).length,color,sides)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def sushi(p,x,y,z,size=1,gold=False):
        p.box((x,y,z+.07*size),(.50*size,.29*size,.14*size),6)
        p.box((x,y,z+.19*size),(.57*size,.33*size,.10*size),5)
        for dx in (-.18,-.06,.06,.18): p.box((x+dx*size,y,z+.245*size),(.027*size,.31*size,.012*size),6)
    def hopper(name,x,y,z,size):
        p=part(name)
        # Closed sloping vessel with inset food surface, not a floating open box.
        p.loft(x,y,[(z,.36*size,.32*size),(z+.22*size,.40*size,.36*size),(z+.82*size,.82*size,.69*size)],1,4)
        p.ring((x,y,z+.80*size),(.85*size,.72*size),(.73*size,.61*size),.09*size,4 if LEVEL>=3 else 3,4)
        p.loft(x,y,[(z+.82*size,.70*size,.58*size),(z+.97*size,.59*size,.47*size)],6,4)
        for i in range(4):
            for j in range(3):
                p.box((x+(i-1.5)*.23*size,y+(j-1)*.23*size,z+(.99+.025*((i+j)%2))*size),(.20*size,.18*size,.095*size),6)
        return p.finish(.012)
    def badge(p,x,y,z,size=1):
        # Raised fish emblem, visible at phone size.
        for outline in [[(-.29,0),(-.19,.12),(.10,.12),(.24,0),(.10,-.12),(-.19,-.12)],[(.22,0),(.40,.15),(.40,-.15)]]:
            n=len(outline)
            p.poly([(x+dx*size,yy,z+dz*size) for yy in (y-.025*size,y+.025*size) for dx,dz in outline],
                   [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],6)
        p.box((x-.15*size,y-.034*size,z+.032*size),(.045*size,.012*size,.045*size),1)

    width,depth=[(4.25,4.20),(4.95,4.65),(5.50,5.10),(5.70,5.50)][LEVEL-1]
    p=part('Foundation'); p.box((0,0,.10),(width,depth,.20),0); p.finish(.025)
    p=part('Machine_Chassis')
    p.box((0,-.16,.59),(3.35,2.72,.78),1)
    for x in (-1.59,1.59): p.box((x,-.18,.68),(.17,2.74,.94),2)
    p.box((0,-1.57,.63),(2.56,.10,.78),1)
    for x in (-1.32,1.32): p.box((x,-1.64,.67),(.095,.045,.81),4 if LEVEL>=3 else 3)
    p.box((0,-1.638,.95),(2.60,.035,.06),4 if LEVEL>=3 else 3)
    badge(p,0,-1.647,.60,1.35); p.finish(.012)
    # Closed capsule-shaped belt, with separate rails. The dishes will use the same path in Three.js.
    def capsule(p,radius,z,height,color):
        points=[(side*.98+radius*math.cos(a),-.95+radius*math.sin(a))
                for side,start in [(1,-math.pi/2),(-1,math.pi/2)] for a in [start+i*math.pi/12 for i in range(13)]]
        n=len(points)
        p.poly([(x,y,zz) for zz in (z-height/2,z+height/2) for x,y in points],
               [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],color)
    p=part('Production_Belt'); capsule(p,.57,1.045,.13,3); capsule(p,.51,1.125,.035,1); capsule(p,.23,1.15,.045,2); p.finish()
    p=part('Belt_Edge')
    for y in (-1.53,-.37): p.box((0,y,1.10),(1.96,.045,.10),4 if LEVEL>=3 else 2)
    p.finish()
    p=part('Rear_Cabinet')
    back_height=[1.80,2.10,2.72,3.12][LEVEL-1]
    p.box((0,.93,(back_height+.2)/2),(2.42,1.27,back_height-.2),2)
    p.box((0,1.59,1.02),(1.23,.06,1.57),1)
    for z in (.53,.74,.95,1.16,1.37): p.box((0,1.625,z),(.94,.025,.052),3)
    p.box((.47,1.641,1.50),(.055,.04,.13),4)
    p.box((0,.93,back_height+.045),(2.56,1.41,.09),1)
    for x in (-1.19,1.19):
        p.box((x,.93,back_height-.08),(.075,1.35,.12),4 if LEVEL>=3 else 3)
    p.finish(.018)
    p=part('Process_Display'); p.box((0,.277,1.64),(.77,.045,.33),1)
    for x in (-.20,.20): p.box((x,.248,1.66),(.17,.016,.105),7)
    p.box((0,.248,1.55),(.42,.016,.033),4); p.finish()
    hopper('Rice_Hopper',0,.93,back_height+.09,[.80,1.05,1.29,1.52][LEVEL-1])
    p=part('Control_Desk')
    p.box((-1.83,-.45,.79),(.43,.83,1.18),2)
    p.box((-1.83,-.881,1.04),(.31,.022,.27),1)
    p.box((-1.83,-.9,1.05),(.22,.018,.13),7)
    for x,c in [(-1.92,5),(-1.75,8)]: p.box((x,-.897,.76),(.08,.035,.08),c)
    p.finish(.012)
    for side in ([-1] if LEVEL==1 else [-1,1]):
        name='L' if side<0 else 'R'; inward=-side
        p=part(f'Robot_{name}_Base'); p.box((side*1.62,-.53,1.19),(.50,.62,.52),2)
        p.cylinder((side*1.62,-.53,1.48),.235,.12,3,12); p.finish(.02)
        shoulder=empty(f'Robot_{name}_Shoulder',(side*1.62,-.53,1.55),angle=inward*.64)
        p=part(f'Robot_{name}_Upper',shoulder)
        beam(p,(0,0,0),(0,0,.78),.24,.27,2)
        beam(p,(0,-.148,.13),(0,-.148,.62),.09,.026,4)
        pipe(p,(0,-.19,0),(0,.19,0),.19,4,12); pipe(p,(0,-.207,0),(0,-.198,0),.075,3,10)
        p.finish(.015)
        elbow=empty(f'Robot_{name}_Elbow',(0,0,.78),shoulder,inward*1.42)
        p=part(f'Robot_{name}_Forearm',elbow)
        beam(p,(0,0,0),(0,0,.77),.20,.23,2)
        pipe(p,(0,-.17,0),(0,.17,0),.155,4,12)
        p.finish(.014)
        wrist=empty(f'Robot_{name}_Wrist',(0,0,.77),elbow,inward*(math.pi-2.06))
        p=part(f'Robot_{name}_Gripper',wrist)
        p.cylinder((0,0,.075),.13,.15,3,10)
        for x in (-.15,.15): p.box((x,0,.22),(.055,.11,.26),4 if LEVEL>=3 else 3)
        p.finish()
    if LEVEL>=2:
        p=part('Side_Equipment')
        p.box((1.83,.77,.82),(.71,1.07,1.24),1)
        p.box((1.84,.205,.91),(.45,.04,.64),2)
        p.box((1.84,.177,.94),(.24,.022,.34),7)
        pipe(p,(1.83,.90,1.45),(1.83,.90,2.36),.09,3)
        pipe(p,(1.83,.90,2.36),(.95,.90,2.36),.09,3)
        p.finish(.01)
        p=part('Ingredient_Tray'); p.box((-1.72,.83,.58),(.65,1.03,.74),1)
        for y in (.48,.83,1.18): sushi(p,-1.72,y,.955,.55)
        p.finish()
        p=part('Warning_Lights')
        for x in (-1.14,1.14):
            p.cylinder((x,1.42,back_height+.17),.13,.18,3,10)
            p.loft(x,1.42,[(back_height+.26,.10,.10),(back_height+.43,.075,.075),(back_height+.46,.025,.025)],8,10)
        p.finish()
    if LEVEL>=3:
        p=part('Brass_Gallery')
        p.box((0,1.94,1.95),(4.72,.48,.12),1)
        for x in (-2.27,-1.15,0,1.15,2.27):
            p.cylinder((x,2.13,2.24),.029,.52,4,8)
            if abs(x)>2: p.box((x,1.94,1.09),(.13,.13,1.66),3)
        for a,b in [(-2.28,-1.78),(-1.12,2.28)]: pipe(p,(a,2.13,2.51),(b,2.13,2.51),.035,4,8)
        p.finish()
        p=part('Maintenance_Ladder')
        for x in (-1.70,-1.20): pipe(p,(x,2.28,.20),(x,2.28,2.60),.033,3,8)
        for z in (.38,.67,.96,1.25,1.54,1.83): pipe(p,(-1.70,2.28,z),(-1.20,2.28,z),.031,4,8)
        p.finish()
        p=part('Twin_Silos')
        for side in (-1,1):
            x=side*2.08; ztop=3.08 if LEVEL==3 else 3.68
            p.cylinder((x,1.18,.61),.39,.82,1,12)
            p.cylinder((x,1.18,(1.02+ztop)/2),.34,ztop-1.02,7,12)
            for z in (1.04,ztop): p.cylinder((x,1.18,z),.385,.12,4,12)
            p.loft(x,1.18,[(ztop+.06,.37,.37),(ztop+.28,.22,.22),(ztop+.31,.07,.07)],1,12)
            for y in (.86,1.50): p.box((x,y,(1.1+ztop)/2),(.05,.055,ztop-1.1),4)
        p.finish()
        p=part('Grand_Fascia')
        p.box((0,.255,2.58),(2.62,.17,.48),1)
        for z in (2.35,2.81): p.box((0,.154,z),(2.70,.05,.06),4)
        badge(p,0,.135,2.59,1.25)
        for x in (-.92,.92): p.box((x,.141,2.59),(.20,.035,.18),8)
        p.finish(.01)
        p=part('Gold_Service_Panels')
        for x in (-2.15,2.15):
            p.box((x,-.31,.65),(.74,.80,.90),1)
            p.box((x,-.731,.72),(.51,.025,.55),4)
            for z in (.54,.72,.90): p.box((x,-.751,z),(.35,.018,.034),3)
        p.finish(.01)
    if LEVEL==4:
        p=part('Crown_Gantry')
        for x in (-1.70,1.70):
            p.box((x,1.01,3.14),(.16,.20,2.93),1)
            p.box((x,.899,3.63),(.055,.027,1.75),4)
            p.loft(x,1.01,[(4.61,.21,.21),(4.78,.10,.10),(4.92,.035,.035)],4,8)
        p.box((0,1.01,4.55),(3.57,.27,.16),4)
        p.box((0,1.01,4.78),(.18,.22,.45),3)
        p.finish()
        gear=empty('Crown_Gear',(0,1.01,5.01)); gear.rotation_euler.x=math.pi/2
        p=part('Crown_Gear_Mesh',gear); p.ring((0,0,0),(.90,.90),(.71,.71),.12,4,32)
        for i in range(12):
            a=i*math.tau/12
            beam(p,(.80*math.cos(a),.80*math.sin(a),0),(.98*math.cos(a),.98*math.sin(a),0),.15,.13,4)
        for a in (0,math.pi/2): beam(p,(-.75*math.cos(a),-.75*math.sin(a),0),(.75*math.cos(a),.75*math.sin(a),0),.075,.085,4)
        p.finish()
        p=part('Grand_Nigiri_Sign')
        pipe(p,(0,.85,4.55),(0,.49,4.96),.075,3)
        p.box((0,.45,4.96),(1.91,.27,.20),4)
        sushi(p,0,.40,5.065,2.85)
        p.finish(.02)
        # Two supported fan rotors add slow, readable machinery movement.
        for side in (-1,1):
            p=part(f'Turbine_{side}_Housing'); p.box((side*2.14,-.16,1.41),(.78,.73,.84),2)
            pipe(p,(side*2.14,-.55,1.43),(side*2.14,-.61,1.43),.34,1,16); p.finish(.025)
            rotor=empty('Fan_Left' if side<0 else 'Fan_Right',(side*2.14,-.65,1.43)); rotor.rotation_euler.x=math.pi/2
            p=part('Fan_Blades',rotor); p.cylinder((0,0,0),.07,.07,4,10)
            for a in (0,math.tau/3,2*math.tau/3): beam(p,(.065*math.cos(a),.065*math.sin(a),0),(.27*math.cos(a),.27*math.sin(a),0),.12,.045,4)
            p.finish()
        p=part('Triumph_Steps'); p.box((0,-1.99,.28),(2.10,.53,.16),1)
        p.box((0,-2.23,.255),(2.22,.08,.11),4); p.finish(.012)
    p=part('Auto_Plate'); p.cylinder((0,0,.026),.20,.052,4 if LEVEL==4 else 2,12); sushi(p,0,0,.052,.52)
    plate=p.finish(); plate.hide_render=True; plate.hide_set(True)
    for i in range(3+LEVEL):
        distance=i*(3.92+math.tau*.39)/(3+LEVEL)
        if distance<1.96: x,y=-.98+distance,-.56
        elif distance<1.96+math.pi*.39:
            a=math.pi/2-(distance-1.96)/.39; x,y=.98+.39*math.cos(a),-.95+.39*math.sin(a)
        elif distance<3.92+math.pi*.39: x,y=.98-(distance-1.96-math.pi*.39),-1.34
        else:
            a=-math.pi/2-(distance-3.92-math.pi*.39)/.39; x,y=-.98+.39*math.cos(a),-.95+.39*math.sin(a)
        o=plate.copy(); o.name=f'Preview_Dish_{i}'; model.objects.link(o); o.location=(x,y,1.145); o.hide_render=False; o.hide_set(False)
    world=bpy.data.worlds.new(f'Auto{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    camera_data=bpy.data.cameras.new('Auto_Preview_Camera'); camera_data.type=next(i.identifier for i in camera_data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); camera_data.ortho_scale=10.2
    camera=bpy.data.objects.new('Auto_Preview_Camera',camera_data); rig.objects.link(camera); scene.camera=camera
    for name,loc,energy,size in [('Key',(-3,-4,8),800,5),('Fill',(5,-2,6),400,4),('Rim',(1,5,8),750,4)]:
        data=bpy.data.lights.new(name,next(i.identifier for i in bpy.types.Light.bl_rna.properties['type'].enum_items if i.identifier=='AREA')); data.energy=energy; data.size=size
        light=bpy.data.objects.new(name,data); rig.objects.link(light); light.location=loc; light.rotation_euler=(Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
    try: scene.render.engine='BLENDER_EEVEE'
    except TypeError: raise RuntimeError('EEVEE renderer unavailable')
    scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100; scene.render.film_transparent=True
    scene.render.image_settings.file_format=next(i.identifier for i in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
    scene.render.image_settings.color_mode=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['color_mode'].enum_items if i.identifier=='RGBA')

bpy.context.window.scene=scene; model=next(c for c in scene.collection.children if c.name.endswith('_MODEL')); camera=scene.camera
camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.2))-camera.location).to_track_quat('-Z','Y').to_euler(); bpy.context.view_layer.update()
meshes=[o for o in model.objects if o.type=='MESH' and not o.name.startswith('Preview_')]; checks=[]
for obj in meshes:
    obj.data.calc_loop_triangles(); bm=bmesh.new(); bm.from_mesh(obj.data)
    item={'name':obj.name,'tris':len(obj.data.loop_triangles),'non_manifold':sum(not e.is_manifold for e in bm.edges),'zero_area':sum(f.calc_area()<1e-10 for f in bm.faces),'loose_vertices':sum(not v.link_faces for v in bm.verts),'volume':bm.calc_volume(signed=True)}
    bm.free(); assert not any(item[k] for k in ('non_manifold','zero_area','loose_vertices')) and item['volume']>0,item
    checks.append(item)
prototype=next(o for o in meshes if o.name.startswith('Auto_Plate'))
stats={'level':LEVEL,'triangles':sum(c['tris'] for c in checks),'objects':len(meshes),'materials':len(set(m for o in meshes for m in o.data.materials)),'checks':checks}
stats['visible_triangles']=stats['triangles']+(2+LEVEL)*len(prototype.data.loop_triangles)
assert stats['visible_triangles']<=[5000,7500,11000,15000][LEVEL-1],stats['visible_triangles']
(OUT/'checks.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
scene.render.filepath=str(OUT/'front-3q.png'); bpy.ops.render.render(write_still=True)
print(json.dumps({k:v for k,v in stats.items() if k!='checks'}))
if FINAL:
    for name,loc in [('back-3q',(-7,10,7)),('side',(10,0,4.5)),('top',(0,0,12))]:
        camera.location=loc; camera.rotation_euler=(Vector((0,0,2.2))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
    camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.2))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.libraries.write(str(OUT/f'auto-sushi-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.type=='EMPTY' and o.parent.name!=f'Auto_L{LEVEL}_ROOT' or o==prototype]
    static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Auto_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Auto_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True)
    selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Auto_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected: o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/03-auto-sushi-machine'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'auto-sushi-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh); prototype.hide_set(True)
