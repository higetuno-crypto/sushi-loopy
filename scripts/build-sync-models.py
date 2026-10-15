"""Blender MCP: LEVEL=1..4; FINAL=True saves the editable scene, GLB and four views."""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector, Matrix

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
assert LEVEL in (1,2,3,4)
OUT=REPO/f'assets/models/09-global-freshness-sync/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_09_Sync_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Sync_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Sync_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Sync_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='global_freshness_sync'; root['level']=LEVEL
    palette=[('Stone',(.39,.42,.36)),('Navy',(.025,.075,.13)),('Ivory',(.82,.80,.68)),
             ('Gold',(.90,.49,.075)),('Steel',(.27,.40,.45)),('SignalBlue',(.035,.54,.76)),
             ('Coral',(.82,.16,.075)),('Amber',(.96,.46,.035)),('Snow',(.91,.93,.78))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'Y{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.32 if name in ('Gold','SignalBlue','Amber') else .65
        bsdf.inputs['Metallic'].default_value=.5 if name=='Gold' else .25 if name=='Steel' else 0
        if name in ('Amber','SignalBlue'):
            bsdf.inputs['Emission Color'].default_value=(*color,1); bsdf.inputs['Emission Strength'].default_value=.18
        mats.append(m)
    def part(name,parent=root): return Part(name,mats,model,parent)
    def empty(name,loc,parent=root):
        o=bpy.data.objects.new(name,None); model.objects.link(o); o.parent=parent; o.location=loc; return o
    def pipe(p,a,b,radius,color=3,sides=8):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.cylinder((0,0,0),radius,(b-a).length,color,sides)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def sphere(p,center,radius,color,sides=12):
        x,y,z=center
        p.loft(x,y,[(z+radius*math.cos(a),max(.006,radius*math.sin(a)),max(.006,radius*math.sin(a)))
                   for a in [math.pi-i*math.pi/8 for i in range(9)]],color,sides)
    def vertical_ring(p,radius,band,color,angle=0):
        start=len(p.verts); p.ring((0,0,0),(radius,radius),(radius-band,radius-band),.06,color,32)
        rotation=Matrix.Rotation(angle,3,'Z')@Matrix.Rotation(math.pi/2,3,'X')
        p.verts[start:]=[tuple(rotation@Vector(v)) for v in p.verts[start:]]
    radius=[1.30,1.52,1.76,2.00][LEVEL-1]; height=[2.28,2.70,3.15,3.65][LEVEL-1]
    core_height=[.48,.62,.95,1.35][LEVEL-1]; core_radius=[.36,.43,.52,.61][LEVEL-1]
    tower_radius=.87+.055*(LEVEL-1); top=height-.53
    p=part('Chamfered_Foundation'); p.box((0,0,.15),(5.4,4.5,.30),0); p.finish(.12)
    p=part('Octagonal_Observatory')
    p.loft(0,0,[(.30,tower_radius+.14,tower_radius+.14),(.48,tower_radius+.14,tower_radius+.14),
                (.55,tower_radius,tower_radius),(top,tower_radius*.63,tower_radius*.63)],1,8)
    for z,r in ((.48,tower_radius+.15),(top,tower_radius*.67)):
        p.cylinder((0,0,z),r,.12,3,8)
    p.cylinder((0,0,top+.21),.41,.32,1,12)
    p.cylinder((0,0,top+.41),.46,.09,3,16)
    p.cylinder((0,0,height-.025),.19,.14,4,12)
    for i in range(8):
        a=(i+.5)*math.tau/8; dx,dy=math.cos(a),math.sin(a)
        pipe(p,(dx*tower_radius*.96,dy*tower_radius*.96,.60),(dx*tower_radius*.63,dy*tower_radius*.63,top-.06),.035,3)
    p.finish()
    p=part('Entry_And_Steps')
    p.box((0,-tower_radius*.88,.70),(.62,.18,.78),2)
    p.box((0,-tower_radius*.98,.65),(.37,.035,.62),1)
    p.box((.10,-tower_radius- .01,.64),(.06,.045,.07),3)
    p.box((0,-1.17,.38),(1.05,.68,.16),2)
    p.box((0,-1.58,.34),(1.25,.26,.08),0)
    p.box((0,-tower_radius*.84,1.22),(.61,.12,.22),3)
    p.box((0,-tower_radius*.91,1.22),(.42,.028,.12),5)
    p.finish(.015)
    p=part('Signal_Ribs_And_Rear_Hatch')
    for side in (-1,1):
        for z in (.75,1.02,1.29):
            x=side*(tower_radius-(z-.55)*(tower_radius*.37)/(top-.55))
            p.box((x,0,z),(.06,.38,.09),5 if z==1.02 else 4)
    p.box((0,tower_radius*.88,.87),(.62,.12,.76),4)
    for z in (.64,.80,.96,1.12):p.box((0,tower_radius*.96,z),(.44,.05,.065),1)
    p.finish()
    # The orbit is a real rotor: three spokes connect the bearing to a solid circular rail.
    orbit=empty('Sync_Orbit',(0,0,height)); orbit['radius']=radius; orbit['height']=height
    p=part('Planetary_Rail',orbit)
    p.ring((0,0,0),(radius+.10,radius+.10),(radius-.07,radius-.07),.12,3,40)
    p.cylinder((0,0,0),.26,.10,3,16)
    for i,color in enumerate((6,8,5)):
        a=-math.pi/2+i*math.tau/3; x,y=radius*math.cos(a),radius*math.sin(a)
        pipe(p,(0,0,0),(x,y,0),.045,3)
        p.cylinder((x,y,.11),.16,.16,1,10)
        p.cylinder((x,y,.19),.19,.055,3,12)
        sphere(p,(x,y,.40+.025*(LEVEL-1)),.20+.035*(LEVEL-1),color)
        p.ring((x,y,.40+.025*(LEVEL-1)),(.22+.035*(LEVEL-1),)*2,(.20+.035*(LEVEL-1),)*2,.045,3,16)
    if LEVEL>=2:
        for i in range(12):
            a=i*math.tau/12; p.cylinder((radius*math.cos(a),radius*math.sin(a),.09),.055,.06,2,6)
    p.finish()
    p=part('Amber_World_Core')
    p.cylinder((0,0,height+core_height/2),.115,core_height,3,12)
    sphere(p,(0,0,height+core_height),core_radius,7,16)
    p.ring((0,0,height+core_height),(.035+core_radius,)*2,(core_radius-.015,)*2,.055,3,24)
    for z in (-.19,.19):
        r=math.sqrt(core_radius**2-z**2)
        p.ring((0,0,height+core_height+z),(r+.025,)*2,(r-.015,)*2,.04,3,20)
    p.finish()
    p=part('Communications_Annexes')
    for side in ((-1,) if LEVEL==1 else (-1,1)):
        x=side*1.70
        p.box((x,.30,.75),(.85,1.10,.90),2)
        p.box((x,.30,1.25),(.99,1.23,.12),1)
        p.box((x,-.27,.77),(.52,.055,.52),1)
        p.box((x,-.307,.88),(.35,.03,.19),5)
        for z in (.59,.68):p.box((x,-.31,z),(.35,.03,.055),4)
        p.cylinder((x,.49,1.34),.21,.12,3,12)
        pipe(p,(x,.49,1.39),(x,.49,1.65),.065,4)
        pipe(p,(side*.75,.67,.61),(x,.67,.61),.08,4)
    p.finish(.015)
    for side in ((-1,) if LEVEL<3 else (-1,1)):
        dish=empty('Sync_Dish_Left' if side<0 else 'Sync_Dish_Right',(side*1.70,.49,1.66))
        p=part('Concave_Dish',dish); n=16; r=.44
        # Front and back have thickness; the antenna points above the horizon.
        p.poly([(rr*math.cos(i*math.tau/n),rr*math.sin(i*math.tau/n),z)
                for rr,z in ((.06,0),(r,.18),(r,.13),(.06,-.055)) for i in range(n)],
               [(j*n+i,j*n+(i+1)%n,((j+1)%4)*n+(i+1)%n,((j+1)%4)*n+i) for j in range(4) for i in range(n)],2)
        p.cylinder((0,0,.12),.035,.35,4,8);sphere(p,(0,0,.32),.075,5,8)
        p.ring((0,0,.165),(.46,.46),(.425,.425),.065,3,16)
        rotation=Vector((0,0,1)).rotation_difference(Vector((0,-.78,.625)).normalized())
        p.verts=[tuple(rotation@Vector(v)) for v in p.verts];p.finish()
    p=part('Sushi_Calibration_Station')
    p.box((1.73,-1.35,.52),(.73,.66,.44),1)
    p.box((1.73,-1.35,.79),(.89,.76,.11),3)
    p.cylinder((1.73,-1.35,.87),.30,.05,2,16)
    p.box((1.73,-1.35,.965),(.37,.23,.15),8)
    p.box((1.73,-1.35,1.075),(.43,.27,.09),6)
    for x in (1.61,1.73,1.85):p.box((x,-1.35,1.124),(.026,.26,.012),8)
    p.box((1.73,-1.70,.58),(.34,.035,.12),5)
    p.finish(.012)
    if LEVEL>=2:
        if LEVEL==2:
            p=part('Secondary_Communications_Beacon')
            sphere(p,(1.70,.49,1.72),.12,7,10);p.finish()
        p=part('Rear_Cooling_Circuit')
        for x in (-.58,.58):
            p.loft(x,1.37,[(.30,.24,.24),(.40,.27,.27),(1.20,.27,.27),(1.30,.20,.20)],1,12)
            for z in (.43,1.13):p.ring((x,1.37,z),(.29,.29),(.25,.25),.08,3,12)
            pipe(p,(x,1.37,1.29),(x,.65,1.29),.07,4)
        p.finish()
    if LEVEL>=3:
        p=part('Observation_Balcony')
        p.box((0,1.82,1.45),(3.68,.56,.12),4)
        for x in (-1.74,1.74):
            pipe(p,(x,1.82,.30),(x,1.82,1.39),.045,1)
            pipe(p,(x,2.02,1.51),(x,2.02,1.95),.03,3)
        for a,b in ((-1.74,-.30),(.30,1.74)):pipe(p,(a,2.02,1.95),(b,2.02,1.95),.035,3)
        for x in (-.25,.25):pipe(p,(x,2.15,.30),(x,2.15,1.86),.03,3)
        for z in (.49,.71,.93,1.15,1.37):pipe(p,(-.25,2.15,z),(.25,2.15,z),.025,4)
        p.finish()
        p=part('Gallery_Access')
        p.box((0,1.17,1.45),(.70,.80,.12),4)
        p.box((0,.69,1.85),(.55,.28,.67),2)
        p.box((0,.844,1.84),(.37,.035,.56),1)
        p.box((.10,.87,1.81),(.055,.045,.07),3)
        for x in (-.35,.35):
            for y in (.91,1.48):pipe(p,(x,y,1.51),(x,y,1.87),.025,3)
            pipe(p,(x,.91,1.87),(x,1.48,1.87),.025,3)
        p.finish()
        gimbal=empty('Sync_Gimbal',(0,0,height+core_height)); gimbal['core_radius']=core_radius
        p=part('Celestial_Meridians',gimbal)
        for a in (0,math.pi/2):vertical_ring(p,.76 if LEVEL==3 else .90,.065,3,a)
        p.ring((0,0,-(.76 if LEVEL==3 else .90)),(.17,.17),(.125,.125),.10,3,12)
        p.finish()
        p=part('Tower_Upper_Collars')
        for z in (top-.46,top-.23):
            r=tower_radius-(z-.55)*(tower_radius*.37)/(top-.55)
            p.ring((0,0,z),(r+.04,)*2,(r-.02,)*2,.06,3,8)
        p.finish()
    if LEVEL==4:
        halo=empty('Sync_Halo',(0,0,height+core_height));p=part('Golden_Crown_Halo',halo)
        vertical_ring(p,1.19,.085,3,math.pi/4)
        # Three jewels remain fixed to the ring, above the spinning planet rail.
        for a in (-.65,0,.65):
            x,z=1.17*math.sin(a),1.17*math.cos(a)
            sphere(p,(x*.707,x*.707,z),.13,5 if a==0 else 6,10)
        p.ring((0,0,-1.27),(.17,.17),(.125,.125),.16,3,12)
        p.finish()
        p=part('Royal_Corner_Beacons')
        for x in (-2.28,2.28):
            for y in (-1.78,1.78):
                p.loft(x,y,[(.30,.22,.22),(.46,.22,.22),(.93,.11,.11)],1,8)
                p.cylinder((x,y,.91),.18,.07,3,12)
                sphere(p,(x,y,1.08),.16,7,10)
                p.ring((x,y,.56),(.205,.205),(.16,.16),.065,3,8)
        p.finish()
        p=part('Gold_Entrance_Portico')
        for x in (-.54,.54):
            pipe(p,(x,-1.13,.46),(x,-1.13,1.44),.05,3)
        p.box((0,-1.13,1.48),(1.25,.42,.12),3)
        p.box((0,-1.18,1.57),(.75,.20,.07),2)
        p.finish(.025)
    world=bpy.data.worlds.new(f'Sync{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    data=bpy.data.cameras.new('Sync_Preview_Camera'); data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); data.ortho_scale=9.8
    camera=bpy.data.objects.new('Sync_Preview_Camera',data); rig.objects.link(camera); scene.camera=camera
    for name,loc,energy,size in [('Key',(-3,-4,8),800,5),('Fill',(5,-2,6),400,4),('Rim',(1,5,8),750,4)]:
        data=bpy.data.lights.new(name,next(i.identifier for i in bpy.types.Light.bl_rna.properties['type'].enum_items if i.identifier=='AREA')); data.energy=energy; data.size=size
        light=bpy.data.objects.new(name,data); rig.objects.link(light); light.location=loc; light.rotation_euler=(Vector((0,0,2.6))-light.location).to_track_quat('-Z','Y').to_euler()
    try: scene.render.engine='BLENDER_EEVEE'
    except TypeError: raise RuntimeError('EEVEE renderer unavailable')
    scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100; scene.render.film_transparent=True
    scene.render.image_settings.file_format=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
    scene.render.image_settings.color_mode=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['color_mode'].enum_items if i.identifier=='RGBA')

bpy.context.window.scene=scene; model=next(c for c in scene.collection.children if c.name.endswith('_MODEL')); camera=scene.camera
camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.6))-camera.location).to_track_quat('-Z','Y').to_euler(); bpy.context.view_layer.update()
meshes=[o for o in model.objects if o.type=='MESH']; checks=[]
for obj in meshes:
    obj.data.calc_loop_triangles(); bm=bmesh.new(); bm.from_mesh(obj.data)
    item={'name':obj.name,'tris':len(obj.data.loop_triangles),'non_manifold':sum(not e.is_manifold for e in bm.edges),'zero_area':sum(f.calc_area()<1e-10 for f in bm.faces),'loose_vertices':sum(not v.link_faces for v in bm.verts),'volume':bm.calc_volume(signed=True)}
    # Check each closed component too: a reversed small part cannot hide in a positive total.
    bm.faces.ensure_lookup_table(); pending=set(bm.faces); volumes=[]
    while pending:
        seed=pending.pop(); component={seed}; queue=[seed]
        while queue:
            for edge in queue.pop().edges:
                for face in edge.link_faces:
                    if face in pending:pending.remove(face);component.add(face);queue.append(face)
        volume=0
        for face in component:
            a=face.verts[0].co
            for i in range(1,len(face.verts)-1):volume+=a.dot(face.verts[i].co.cross(face.verts[i+1].co))/6
        assert volume>1e-9,(obj.name,volume)
        volumes.append(volume)
    item['components']=len(volumes);item['min_component_volume']=min(volumes)
    bm.free(); assert not any(item[k] for k in ('non_manifold','zero_area','loose_vertices')) and item['volume']>0,item
    checks.append(item)
stats={'level':LEVEL,'triangles':sum(c['tris'] for c in checks),'objects':len(meshes),'materials':len(set(m for o in meshes for m in o.data.materials)),'checks':checks}
assert stats['triangles']<=[5000,7500,11000,15000][LEVEL-1],stats['triangles']
(OUT/'checks.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
scene.render.filepath=str(OUT/'front-3q.png'); bpy.ops.render.render(write_still=True)
print(json.dumps({k:v for k,v in stats.items() if k!='checks'}))
if FINAL:
    for name,loc in [('back-3q',(-7,10,7)),('side',(10,0,4.5)),('top',(0,0,12))]:
        camera.location=loc; camera.rotation_euler=(Vector((0,0,2.6))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
    camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.6))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.libraries.write(str(OUT/f'sync-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.name!=f'Sync_L{LEVEL}_ROOT']; static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Sync_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Sync_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True); selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Sync_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected:o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/09-global-freshness-sync'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'sync-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
