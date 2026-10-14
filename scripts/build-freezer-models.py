"""Blender MCP: LEVEL=1..4; FINAL=True saves the editable scene, GLB and four views."""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
assert LEVEL in (1,2,3,4)
OUT=REPO/f'assets/models/08-freshness-freezer/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_08_Freezer_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Freezer_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Freezer_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Freezer_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='freshness_freezer'; root['level']=LEVEL
    palette=[('Stone',(.39,.42,.36)),('Navy',(.025,.075,.13)),('Ivory',(.82,.80,.68)),
             ('Steel',(.27,.40,.45)),('Gold',(.90,.49,.075)),('Frost',(.20,.79,.90)),
             ('Fish',(.035,.29,.52)),('Snow',(.83,.97,.95)),('Cold',(.045,.55,.75))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'Z{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.30 if name in ('Frost','Cold') else .4 if name in ('Steel','Gold') else .65
        bsdf.inputs['Metallic'].default_value=.45 if name=='Gold' else .28 if name=='Steel' else 0
        if name=='Cold':
            bsdf.inputs['Emission Color'].default_value=(.015,.45,.65,1); bsdf.inputs['Emission Strength'].default_value=.18
        mats.append(m)
    def part(name,parent=root): return Part(name,mats,model,parent)
    def empty(name,loc,parent=root):
        o=bpy.data.objects.new(name,None); model.objects.link(o); o.parent=parent; o.location=loc; return o
    def beam(p,a,b,width,depth,color):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.box((0,0,0),(width,depth,(b-a).length),color)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def pipe(p,a,b,radius,color=3,sides=10):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.cylinder((0,0,0),radius,(b-a).length,color,sides)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def fin(p,outline,y,depth,color):
        n=len(outline)
        p.poly([(x,yy,z) for yy in (y-depth/2,y+depth/2) for x,z in outline],
            [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],color)
    def snowflake(p,center,r,color=7):
        x,y,z=center
        for i in range(6):
            a=i*math.tau/6; dx,dz=math.sin(a),math.cos(a)
            beam(p,(x,y,z),(x+dx*r,y,z+dz*r),.07,.055,color)
            for side in (-1,1):
                beam(p,(x+dx*r*.62,y,z+dz*r*.62),(x+dx*r*.77+side*dz*r*.23,y,z+dz*r*.77-side*dx*r*.23),.05,.05,color)
    radius=[1.08,1.19,1.31,1.43][LEVEL-1]; floor=.72; top=floor+[1.65,1.95,2.30,2.70][LEVEL-1]
    p=part('Chamfered_Foundation'); p.box((0,0,.15),(5.4,4.5,.30),0); p.finish(.12)
    p=part('Cold_Chamber_Base')
    p.cylinder((0,0,.43),radius+.22,.26,1,24)
    p.cylinder((0,0,.61),radius+.15,.10,3,24)
    p.ring((0,0,.68),(radius+.16,radius+.16),(radius-.04,radius-.04),.12,4 if LEVEL>=2 else 2,24)
    p.cylinder((0,0,.695),radius-.05,.05,8,24)
    for i in range(8):
        a=i*math.tau/8; p.box(((radius+.18)*math.cos(a),(radius+.18)*math.sin(a),.40),(.09,.09,.12),5)
    p.finish()
    # An open observation chamber keeps the fish legible without sorted transparent layers.
    p=part('Faceted_Ice_Chamber'); sides=14
    vertices=[(r*math.cos(a),r*math.sin(a),z) for z,r in [(floor,radius),(floor,radius-.10),(top,radius-.10),(top,radius)]
              for a in [math.radians(-12+204*i/sides) for i in range(sides+1)]]
    n=sides+1
    faces=[(r*n+i,r*n+i+1,((r+1)%4)*n+i+1,((r+1)%4)*n+i) for r in range(4) for i in range(sides)]
    faces += [(0,n,2*n,3*n),(n-1,4*n-1,3*n-1,2*n-1)]
    p.poly(vertices,faces,5); p.finish()
    p=part('Chamber_Rims_And_Braces')
    p.ring((0,0,top+.02),(radius+.16,radius+.16),(radius-.07,radius-.07),.16,2,24)
    p.ring((0,0,top+.12),(radius+.18,radius+.18),(radius-.02,radius-.02),.07,4 if LEVEL>=2 else 3,24)
    for a in [math.radians(-12),math.radians(192),math.pi/2]:
        x,y=radius*math.cos(a),radius*math.sin(a)
        pipe(p,(x,y,floor),(x,y,top),.045,3,8)
    p.finish()
    p=part('Ice_Crystals')
    for i in range(7 if LEVEL<3 else 11):
        a=math.tau*i/(7 if LEVEL<3 else 11); r=radius*.72; x,y=r*math.cos(a),r*math.sin(a)
        h=.20+(i%3)*.08
        p.loft(x,y,[(floor,.11,.11),(floor+h*.65,.11,.11),(floor+h,.012,.012)],7 if i%2 else 5,5)
    p.finish()
    fish=empty('Freezer_Fish',(0,-.08,floor+(top-floor)*.49)); fish.scale=(.82+.09*(LEVEL-1),)*3
    fish['chamber_radius']=radius-.13; fish['floor']=floor; fish['ceiling']=top-.13
    p=part('Bluefin_Mascot',fish); start=len(p.verts); face_start=len(p.faces)
    p.loft(0,0,[(-.70,.08,.12),(-.42,.27,.33),(.20,.33,.36),(.54,.24,.27),(.72,.075,.12)],6,10)
    p.verts[start:]=[(c,a,b) for a,b,c in p.verts[start:]]
    for i in range(face_start,len(p.faces)):
        if sum(p.verts[v][2] for v in p.faces[i])/len(p.faces[i])<-.11:p.colors[i]=7
    fin(p,[(-.45,.27),(-.30,.61),(.22,.33)],0,.07,6)
    for sign in (-1,1):
        pipe(p,(.42,sign*.245,.09),(.42,sign*.315,.09),.115,7,12)
        pipe(p,(.455,sign*.316,.09),(.455,sign*.33,.09),.057,1,10)
        pipe(p,(.47,sign*.331,.12),(.47,sign*.339,.12),.023,7,8)
        fin(p,[(-.12,.02),(-.40,-.19),(.04,-.09)],sign*.27,.075,6)
    p.finish()
    tail=empty('Freezer_Tail',(-.64,0,0),fish)
    p=part('Forked_Tail',tail); fin(p,[(.035,.08),(-.50,.37),(-.36,0),(-.50,-.37),(.035,-.08)],0,.095,6); p.finish()
    p=part('Compressor_Cap')
    cap=top+.15
    p.box((0,.12,cap+.015),(radius*2,.35,.13),3)
    p.cylinder((0,.10,cap+.08),radius*.72,.16,1,20)
    p.box((0,.15,cap+.50),(1.32,1.15,.84),2); p.finish(.055)
    p=part('Raised_Snow_Sign')
    p.box((0,-.447,cap+.51),(.92,.065,.67),1)
    p.box((0,-.49,cap+.51),(.81,.028,.57),8)
    if LEVEL<4:snowflake(p,(0,-.52,cap+.51),.235)
    for side in (-1,1):
        for z in (cap+.26,cap+.42,cap+.58,cap+.74):p.box((side*.678,.18,z),(.042,.72,.075),1)
    p.box((0,.744,cap+.48),(.87,.04,.54),1)
    for z in (cap+.29,cap+.45,cap+.61):p.box((0,.773,z),(.68,.04,.06),3)
    p.finish()
    p=part('Fan_Cowl'); p.ring((0,.15,cap+.95),(.42,.42),(.34,.34),.10,3,16); p.finish()
    fan=empty('Freezer_Fan',(0,.15,cap+.955)); p=part('Cold_Air_Impeller',fan)
    p.cylinder((0,0,0),.095,.08,4,10)
    for i in range(5):
        a=i*math.tau/5; start=len(p.verts); p.box((.21,0,0),(.23,.10,.045),1)
        p.verts[start:]=[(x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),z) for x,y,z in p.verts[start:]]
    p.finish()
    p=part('Cooling_Pipes')
    for side in ((1,) if LEVEL==1 else (-1,1)):
        x=side*(radius+.42)
        p.box((x,.52,.71),(.61,.66,.82),2)
        points=[(x,.52,1.12),(x,.52,top-.20),(x-side*.18,.52,top+.19),(side*.55,.52,top+.28)]
        for a,b in zip(points,points[1:]):pipe(p,a,b,.105)
        for z in (1.16,top-.26):p.ring((x,.52,z),(.14,.14),(.105,.105),.09,4 if LEVEL>=2 else 1,10)
        for z in (.52,.68,.84):p.box((x,.172,z),(.42,.025,.065),1)
    p.finish()
    p=part('Ice_Supply_And_Console')
    p.box((-1.86,-.96,.69),(.68,.72,.78),2)
    p.box((-1.86,-1.34,.82),(.50,.04,.37),1);p.box((-1.86,-1.367,.89),(.35,.025,.18),8)
    for x in (-2.04,-1.80):p.box((x,-1.37,.67),(.095,.04,.055),4)
    p.box((1.60,-1.42,.51),(.87,.71,.42),1)
    p.box((1.60,-1.42,.73),(.92,.76,.065),3)
    for x,y in ((1.34,-1.62),(1.60,-1.62),(1.85,-1.62),(1.34,-1.31),(1.60,-1.31),(1.85,-1.31)):
        p.box((x,y,.84),(.20,.22,.17),7 if x<1.7 else 5)
    p.box((1.60,-1.793,.54),(.32,.025,.15),4)
    p.finish(.015)
    if LEVEL>=2:
        p=part('Twin_Refrigerant_Reservoirs')
        reservoir_top=1.48 if LEVEL==2 else 2.17
        for side in (-1,1):
            x=side*2.08; y=1.37
            p.loft(x,y,[(.30,.29,.29),(.43,.32,.32),(reservoir_top-.17,.32,.32),(reservoir_top,.22,.22)],2,12)
            for z in (.51,reservoir_top-.27):p.ring((x,y,z),(.34,.34),(.30,.30),.08,4,12)
            p.cylinder((x,y,reservoir_top+.045),.17,.09,8,12)
            pipe(p,(x,y,1.12),(side*(radius+.42),.52,1.12),.075)
        p.finish()
        p=part('Rear_Maintenance_Hatch')
        p.box((0,radius+.01,floor+.65),(1.06,.18,1.0),1)
        p.box((0,radius+.115,floor+.65),(.88,.065,.85),2)
        for z in (floor+.38,floor+.54,floor+.70,floor+.86):p.box((0,radius+.155,z),(.64,.035,.065),3)
        for x in (-.43,.43):p.box((x,radius+.16,floor+.65),(.06,.065,.18),4)
        p.finish()
    if LEVEL>=3:
        p=part('Heavy_Cooling_Fins')
        for side in (-1,1):
            x=side*(radius+.42)
            for z in (1.37,1.62,1.87,2.12):p.ring((x,.52,z),(.25,.25),(.11,.11),.08,4 if LEVEL==4 else 3,12)
        for z in (floor+.035,top+.055):p.ring((0,0,z),(radius+.185,radius+.185),(radius+.12,radius+.12),.055,4,24)
        p.finish()
        p=part('Rear_Service_Gallery')
        p.box((0,1.86,1.19),(3.30,.57,.12),3)
        for x in (-1.48,1.48):
            p.box((x,1.86,.73),(.09,.09,.86),1)
            pipe(p,(x,2.04,1.25),(x,2.04,1.73),.03,4,8)
        for a,b in [(-1.48,-.28),(.28,1.48)]:pipe(p,(a,2.04,1.73),(b,2.04,1.73),.03,4,8)
        for x in (-.24,.24):pipe(p,(x,2.15,.30),(x,2.15,1.64),.027,4,8)
        for z in (.47,.69,.91,1.13):pipe(p,(-.24,2.15,z),(.24,2.15,z),.026,3,8)
        p.finish()
        p=part('Front_Cold_Walkway')
        p.box((0,-1.90,.37),(2.35,.45,.14),2)
        for x in (-1.04,1.04):
            pipe(p,(x,-2.03,.44),(x,-2.03,.79),.035,4,8)
            pipe(p,(x,-2.03,.79),(x,-1.79,.79),.035,4,8)
        for x in (-.52,0,.52):p.box((x,-1.90,.448),(.29,.27,.02),5)
        p.finish()
    if LEVEL==4:
        p=part('Polar_Crown_Cradle')
        p.ring((0,.15,cap+.99),(.84,.84),(.45,.45),.15,4,24)
        for i in range(6):
            a=i*math.tau/6; x,y=.74*math.cos(a),.15+.74*math.sin(a)
            h=.77 if i%2 else 1.01
            p.loft(x,y,[(cap+1.07,.14,.14),(cap+1.24,.21,.21),(cap+1.07+h*.73,.17,.17),(cap+1.07+h,.018,.018)],7 if i%2 else 5,6)
            p.ring((x,y,cap+1.20),(.22,.22),(.18,.18),.08,4,6)
        # The large snowflake turns on a visible bearing within a stationary golden frame.
        start=len(p.verts);p.ring((0,0,0),(.57,.57),(.47,.47),.10,4,12)
        p.verts[start:]=[(x,-.60-z,cap+.51+y) for x,y,z in p.verts[start:]]
        pipe(p,(0,-.46,cap+.51),(0,-.69,cap+.51),.11,4,12)
        p.finish()
        crown=empty('Freezer_Crown',(0,-.71,cap+.51))
        p=part('Polar_Snowflake',crown); snowflake(p,(0,0,0),.42); p.finish()
        p=part('Ice_Tower_Shoulders')
        for side in (-1,1):
            x=side*2.17
            p.loft(x,-.23,[(.30,.25,.25),(.54,.25,.25),(1.78,.20,.20),(2.04,.045,.045)],5,6)
            for z in (.58,1.61):p.ring((x,-.23,z),(.255,.255),(.185,.185),.10,4,6)
            pipe(p,(x,-.23,.62),(side*(radius+.10),-.23,.62),.075,3)
        p.finish()
    world=bpy.data.worlds.new(f'Freezer{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    data=bpy.data.cameras.new('Freezer_Preview_Camera'); data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); data.ortho_scale=9.5
    camera=bpy.data.objects.new('Freezer_Preview_Camera',data); rig.objects.link(camera); scene.camera=camera
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
        camera.location=loc; camera.rotation_euler=(Vector((0,0,2.2))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
    camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.2))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.libraries.write(str(OUT/f'freezer-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.name!=f'Freezer_L{LEVEL}_ROOT']; static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Freezer_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Freezer_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True); selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Freezer_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected:o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/08-freshness-freezer'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'freezer-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
