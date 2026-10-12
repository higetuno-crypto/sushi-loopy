"""Blender MCP: LEVEL=1..4, FINAL=True saves the editable scene, GLB and four views."""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
assert LEVEL in (1,2,3,4)
OUT=REPO/f'assets/models/06-fusion-sushi-converter/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_06_Fusion_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Fusion_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Fusion_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Fusion_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='fusion_sushi_converter'; root['level']=LEVEL
    palette=[('Stone',(.39,.42,.36)),('Navy',(.025,.075,.13)),('Ivory',(.82,.77,.62)),
             ('Steel',(.25,.35,.39)),('Gold',(.90,.49,.075)),('Salmon',(.90,.19,.07)),
             ('Rice',(.98,.88,.64)),('Core',(1.0,.38,.025)),('Coolant',(.075,.53,.61))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'F{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.38 if name in ('Steel','Gold') else .65
        bsdf.inputs['Metallic'].default_value=.5 if name=='Gold' else .3 if name=='Steel' else 0
        if name=='Core':
            bsdf.inputs['Emission Color'].default_value=(1,.21,.008,1); bsdf.inputs['Emission Strength'].default_value=.35
        mats.append(m)
    def part(name,parent=root): return Part(name,mats,model,parent)
    def empty(name,loc):
        o=bpy.data.objects.new(name,None); model.objects.link(o); o.parent=root; o.location=loc; return o
    def beam(p,a,b,width,depth,color):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.box((0,0,0),(width,depth,(b-a).length),color)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def pipe(p,a,b,radius,color=3,sides=10):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.cylinder((0,0,0),radius,(b-a).length,color,sides)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def upright(p,start,x,y,z):
        p.verts[start:]=[(x+a,y-c,z+b) for a,b,c in p.verts[start:]]
    def ring(p,x,y,z,outer,inner,depth,color,sides=32):
        start=len(p.verts); p.ring((0,0,0),(outer,outer),(inner,inner),depth,color,sides); upright(p,start,x,y,z)
    def disk(p,x,y,z,r,depth,color,sides=24):
        pipe(p,(x,y-depth/2,z),(x,y+depth/2,z),r,color,sides)
    def rail(p,a,b,z):
        for x,y in (a,b): pipe(p,(x,y,z),(x,y,z+.38),.035,4,8)
        pipe(p,(*a,z+.38),(*b,z+.38),.03,4,8)
    radius=[1.03,1.15,1.27,1.37][LEVEL-1]; center=[2.16,2.48,2.80,3.08][LEVEL-1]
    p=part('Chamfered_Foundation'); p.box((0,0,.15),(5.4,4.5,.30),0); p.finish(.12)
    p=part('Reactor_Pedestal'); bottom=center-radius-.15
    p.loft(0,.22,[(.30,1.24,1.03),(.47,1.24,1.03),(.58,1.10,.90),(bottom,1.10,.90)],1,16)
    p.ring((0,.22,.50),(1.25,1.04),(1.08,.87),.09,4 if LEVEL>=2 else 3,16)
    p.ring((0,.22,bottom-.04),(1.17,.96),(1.07,.86),.12,4,16)
    for x in (-.65,.65):
        p.box((x,-.70,(bottom+.62)/2),(.34,.06,bottom-.62),3)
        p.box((x,-.742,(bottom+.62)/2),(.17,.035,(bottom-.62)*.65),7)
    p.finish()
    p=part('Pressure_Housing')
    ring(p,0,.28,center,radius+.15,radius-.03,.83,1)
    ring(p,0,-.16,center,radius+.18,radius-.03,.13,4 if LEVEL>=2 else 3)
    ring(p,0,-.24,center,radius+.055,radius-.015,.055,4)
    disk(p,0,.74,center,radius+.10,.13,3)
    for i in range(8 if LEVEL<3 else 12):
        a=i*math.tau/(8 if LEVEL<3 else 12); x=(radius+.095)*math.cos(a); z=center+(radius+.095)*math.sin(a)
        disk(p,x,-.243,z,.05,.035,2,8)
    p.finish()
    p=part('Amber_Core_Bowl'); start=len(p.verts)
    p.loft(0,0,[(-.055,radius*.96,radius*.96),(.005,radius*.96,radius*.96),(.14,radius*.74,radius*.74),(.22,.10,.10)],7,32)
    upright(p,start,0,.60,center); p.finish()
    # A visible bearing and spokes support the sushi rotor inside the chamber.
    p=part('Core_Bearing'); disk(p,0,.18,center,.17,.44,4,12); p.finish()
    rotor=empty('Fusion_Rotor',(0,-.16,center)); rotor['chamber_radius']=radius-.03
    p=part('Twin_Nigiri_Rotor',rotor)
    ring(p,0,.12,0,radius*.60,radius*.565,.055,4,24)
    disk(p,0,.10,0,.15,.11,3,12)
    for sign in (-1,1):
        z=sign*radius*.41
        beam(p,(0,.11,0),(0,.11,z),.06,.06,4)
        pipe(p,(0,.11,z),(0,-.02,z),.075,4,8)
        # Sushi faces outward as a raised rice/topping relief, never a texture plane.
        start=len(p.verts)
        p.loft(0,z,[(-.02,radius*.41,radius*.15),(.025,radius*.53,radius*.21),(.14,radius*.50,radius*.20),(.18,radius*.44,radius*.16)],6,12)
        p.loft(0,z,[(.17,radius*.52,radius*.17),(.22,radius*.55,radius*.18),(.30,radius*.48,radius*.145)],5,12)
        for dx in (-.30,0,.30):
            p.box((dx*radius,z,.305),(.035,radius*.21,.012),6)
        upright(p,start,0,0,0)
    p.finish()
    p=part('Top_Inductor'); cap=center+radius+.14
    p.cylinder((0,.22,cap+.10),.42,.20,1,16)
    p.ring((0,.22,cap+.20),(.44,.44),(.32,.32),.07,4,16)
    p.loft(0,.22,[(cap+.20,.30,.30),(cap+.44,.24,.24),(cap+.55,.12,.12)],7,12)
    if LEVEL>=3:
        for z in (cap+.27,cap+.40): p.ring((0,.22,z),(.35,.35),(.24,.24),.045,4,16)
    p.finish()
    p=part('Cooling_Circuits')
    tank_sides=(1,) if LEVEL==1 else (-1,1)
    for side in tank_sides:
        x=side*2.08; h=center+.12+(0.25 if side<0 else 0)
        p.loft(x,.80,[(.30,.40,.40),(.48,.40,.40),(.60,.31,.31),(h-.14,.31,.31),(h,.22,.22)],1,12)
        for z in (.65,h-.21): p.ring((x,.80,z),(.33,.33),(.30,.30),.13,4,12)
        points=[(x,.80,h),(x,.80,cap-.08),(x-side*.23,.80,cap+.15),(side*.34,.80,cap+.15),(side*.34,.22,cap+.15)]
        for a,b in zip(points,points[1:]): pipe(p,a,b,.115,3)
        for z in ([.86,1.11,1.36,1.61] if LEVEL>=3 else [1.05]):
            p.ring((x,.80,z),(.37,.37),(.30,.30),.065,4 if LEVEL==4 else 3,12)
        pipe(p,(x,.80,.76),(x,-.15,.76),.105,3)
        pipe(p,(x,-.15,.76),(side*1.02,-.15,.76),.105,3)
    p.finish()
    p=part('Operator_Console'); p.box((-1.82,-1.33,.82),(1.07,.95,1.04),2)
    p.box((-1.82,-1.33,1.38),(1.16,1.02,.08),1); p.finish(.04)
    p=part('Controls_And_Service_Hatch')
    p.box((-1.82,-1.821,1.04),(.78,.045,.43),1)
    p.box((-1.82,-1.854,1.10),(.58,.03,.23),7)
    for x,c in ((-2.05,5),(-1.79,8),(-1.56,4)): p.box((x,-1.856,.79),(.105,.035,.065),c)
    for z in (.47,.59): p.box((-1.81,-1.82,z),(.56,.035,.052),3)
    p.box((-2.367,-1.31,.82),(.035,.64,.68),1)
    p.box((-2.39,-1.31,.82),(.022,.52,.55),3)
    # Rear hatch, hinges and cooling ribs make the back a designed face too.
    disk(p,0,.83,center,radius*.51,.08,1,16)
    ring(p,0,.882,center,radius*.49,radius*.43,.04,4 if LEVEL>=3 else 3,16)
    for z in (-.24,0,.24): p.box((0,.896,center+z),(.56,.035,.07),3)
    for x in (-.57,.57): p.box((x,.88,center),(.095,.10,.25),4)
    p.finish()
    p=part('Front_Access')
    p.box((.10,-1.62,.38),(1.48,.88,.16),2)
    p.box((.10,-1.93,.335),(1.60,.48,.07),2)
    for x in (-.52,.73): rail(p,(x,-1.77),(x,-1.26),.46)
    p.box((.10,-1.62,.469),(.61,.25,.018),4)
    p.finish()
    if LEVEL>=2:
        p=part('Capacitor_Bank')
        for x in (1.37,2.11):
            p.loft(x,-1.35,[(.30,.25,.25),(.43,.28,.28),(1.08,.28,.28),(1.25,.17,.17)],2,12)
            for z in (.45,.97): p.ring((x,-1.35,z),(.295,.295),(.27,.27),.08,4,12)
            p.cylinder((x,-1.35,1.31),.12,.12,8,10)
        pipe(p,(1.37,-1.35,1.38),(2.11,-1.35,1.38),.065)
        pipe(p,(2.11,-1.35,1.38),(2.11,.80,1.38),.065)
        p.finish()
    if LEVEL>=3:
        p=part('Rear_Service_Gallery'); z=1.40
        p.box((0,1.62,z),(3.6,.72,.12),3)
        for x in (-1.62,1.62):
            p.box((x,1.62,.82),(.10,.10,1.04),1)
            rail(p,(x,1.28),(x,1.96),z+.06)
        rail(p,(-1.62,1.96),(-.29,1.96),z+.06); rail(p,(.29,1.96),(1.62,1.96),z+.06)
        for x in (-.23,.23): pipe(p,(x,2.0,.30),(x,2.0,1.82),.035,4,8)
        for z in (.44,.69,.94,1.19,1.44): pipe(p,(-.23,2,z),(.23,2,z),.028,3,8)
        # Braced radial cooling plates around the pressure housing.
        for side in (-1,1):
            for a in (-.50,0,.50):
                x=side*(radius+.15)*math.cos(a); z=center+(radius+.15)*math.sin(a)
                beam(p,(x,.28,z),(x+side*.24,.28,z),.16,.32,4)
        p.finish()
    if LEVEL==4:
        p=part('Solar_Frame_Bearings'); outer=radius+.46
        ring(p,0,-.38,center,outer+.055,radius+.31,.10,1,40)
        for side in (-1,1):
            x=side*(outer+.04)
            p.box((x,.02,1.42),(.18,.23,2.24),1)
            beam(p,(x,.02,2.53),(side*outer,-.30,center),.18,.20,4)
            disk(p,side*outer,-.30,center,.19,.14,3,12)
        p.finish()
        halo=empty('Fusion_Halo',(0,-.49,center)); halo['inner_radius']=radius+.30
        p=part('Golden_Sun_Ring',halo)
        ring(p,0,0,0,outer+.06,radius+.30,.10,4,40)
        for i in range(12):
            a=i*math.tau/12; x=math.cos(a); z=math.sin(a)
            beam(p,(x*(outer+.015),0,z*(outer+.015)),(x*(outer+.28),0,z*(outer+.28)),.11,.09,4)
            disk(p,x*(outer-.04),-.065,z*(outer-.04),.065,.035,7 if i%3==0 else 8,8)
        p.finish()
    world=bpy.data.worlds.new(f'Fusion{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    data=bpy.data.cameras.new('Fusion_Preview_Camera'); data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); data.ortho_scale=10.2
    camera=bpy.data.objects.new('Fusion_Preview_Camera',data); rig.objects.link(camera); scene.camera=camera
    for name,loc,energy,size in [('Key',(-3,-4,8),800,5),('Fill',(5,-2,6),400,4),('Rim',(1,5,8),750,4)]:
        data=bpy.data.lights.new(name,next(i.identifier for i in bpy.types.Light.bl_rna.properties['type'].enum_items if i.identifier=='AREA')); data.energy=energy; data.size=size
        light=bpy.data.objects.new(name,data); rig.objects.link(light); light.location=loc; light.rotation_euler=(Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
    try: scene.render.engine='BLENDER_EEVEE'
    except TypeError: raise RuntimeError('EEVEE renderer unavailable')
    scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100; scene.render.film_transparent=True
    scene.render.image_settings.file_format=next(i.identifier for i in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
    scene.render.image_settings.color_mode=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['color_mode'].enum_items if i.identifier=='RGBA')

bpy.context.window.scene=scene; model=next(c for c in scene.collection.children if c.name.endswith('_MODEL')); camera=scene.camera
camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.4))-camera.location).to_track_quat('-Z','Y').to_euler(); bpy.context.view_layer.update()
meshes=[o for o in model.objects if o.type=='MESH']; checks=[]
for obj in meshes:
    obj.data.calc_loop_triangles(); bm=bmesh.new(); bm.from_mesh(obj.data)
    item={'name':obj.name,'tris':len(obj.data.loop_triangles),'non_manifold':sum(not e.is_manifold for e in bm.edges),'zero_area':sum(f.calc_area()<1e-10 for f in bm.faces),'loose_vertices':sum(not v.link_faces for v in bm.verts),'volume':bm.calc_volume(signed=True)}
    bm.free(); assert not any(item[k] for k in ('non_manifold','zero_area','loose_vertices')) and item['volume']>0,item
    checks.append(item)
stats={'level':LEVEL,'triangles':sum(c['tris'] for c in checks),'objects':len(meshes),'materials':len(set(m for o in meshes for m in o.data.materials)),'checks':checks}
assert stats['triangles']<=[5000,7500,11000,15000][LEVEL-1],stats['triangles']
(OUT/'checks.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
scene.render.filepath=str(OUT/'front-3q.png'); bpy.ops.render.render(write_still=True)
print(json.dumps({k:v for k,v in stats.items() if k!='checks'}))
if FINAL:
    for name,loc in [('back-3q',(-7,10,7)),('side',(10,0,4.5)),('top',(0,0,12))]:
        camera.location=loc; camera.rotation_euler=(Vector((0,0,2.4))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
    camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.4))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.libraries.write(str(OUT/f'fusion-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.name!=f'Fusion_L{LEVEL}_ROOT']; static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Fusion_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Fusion_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True); selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Fusion_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected: o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/06-fusion-sushi-converter'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'fusion-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
