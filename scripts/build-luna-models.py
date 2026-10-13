"""Blender MCP: LEVEL=1..4, FINAL=True saves the editable scene, GLB and four views."""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector, Quaternion

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
assert LEVEL in (1,2,3,4)
OUT=REPO/f'assets/models/07-luna-sea/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_07_Luna_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Luna_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Luna_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Luna_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='luna_sea'; root['level']=LEVEL
    palette=[('Stone',(.38,.41,.35)),('Navy',(.025,.075,.13)),('Ivory',(.86,.81,.66)),
             ('Steel',(.25,.35,.39)),('Gold',(.91,.50,.075)),('Red',(.85,.105,.035)),
             ('Sea',(.025,.38,.54)),('Ice',(.41,.78,.81)),('Light',(1.0,.49,.055))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'L{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.36 if name in ('Steel','Gold','Sea') else .70
        bsdf.inputs['Metallic'].default_value=.5 if name=='Gold' else .3 if name=='Steel' else 0
        if name=='Light':
            bsdf.inputs['Emission Color'].default_value=(1,.32,.02,1); bsdf.inputs['Emission Strength'].default_value=.45
        mats.append(m)
    def part(name,parent=root): return Part(name,mats,model,parent)
    def empty(name,loc,parent=root):
        o=bpy.data.objects.new(name,None); model.objects.link(o); o.parent=parent; o.location=loc; return o
    def beam(p,a,b,width,depth,color):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.box((0,0,0),(width,depth,(b-a).length),color)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def pipe(p,a,b,radius,color=3,sides=8):
        a,b=Vector(a),Vector(b); q=Vector((0,0,1)).rotation_difference((b-a).normalized()); start=len(p.verts)
        p.cylinder((0,0,0),radius,(b-a).length,color,sides)
        p.verts[start:]=[tuple(q@Vector(v)+(a+b)/2) for v in p.verts[start:]]
    def rail(p,a,b,z):
        for x,y in (a,b): pipe(p,(x,y,z),(x,y,z+.34),.03,4)
        pipe(p,(*a,z+.34),(*b,z+.34),.025,4)
    def crescent(p,x,y,z,r,color):
        d=r*.55; angle=math.acos(d/(2*r)); h=math.sqrt(r*r-d*d); inner=math.atan2(h,-d/2)
        outline=[(r*math.cos(a),r*math.sin(a)) for a in [angle+(math.tau-2*angle)*i/12 for i in range(13)]]
        outline += [(d+r*math.cos(a),r*math.sin(a)) for a in [math.tau-inner-(math.tau-2*inner)*i/10 for i in range(1,10)]]
        n=len(outline); p.poly([(x+a,yy,z+b) for yy in (y-.04,y+.04) for a,b in outline],
            [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],color)
    def lamp(p,x,y,z):
        p.cylinder((x,y,z+.12),.09,.24,1,8); p.loft(x,y,[(z+.24,.105,.105),(z+.42,.07,.07),(z+.46,.02,.02)],8,8)
    cx,cy=-.72,-.43; pad_top=.60
    p=part('Lunar_Foundation'); p.box((0,0,.15),(5.5,4.65,.30),0); p.finish(.12)
    p=part('Launch_Pad'); p.cylinder((cx,cy,.42),1.17,.24,1,16)
    p.ring((cx,cy,.56),(1.20,1.20),(.86,.86),.08,3,16)
    for a in (0,math.pi/2,math.pi,math.pi*1.5):
        x,y=cx+1.06*math.cos(a),cy+1.06*math.sin(a); p.box((x,y,.609),(.16,.16,.018),4)
    p.cylinder((cx,cy,.57),.86,.06,3,16)
    for x in (-1.12,-.70,-.28): p.box((x,-1.81,.365),(.23,.26,.13),2)
    p.finish()
    rocket=empty('Luna_Rocket',(cx,cy,pad_top)); rocket['pad_top']=pad_top; rocket['nozzle_height']=.24
    p=part('Ocean_Explorer',rocket); r=[.42,.47,.51,.54][LEVEL-1]; shoulder=[2.35,2.92,3.55,4.12][LEVEL-1]
    p.loft(0,0,[(.24,.27,.27),(.40,.20,.20),(.61,.31,.31)],3,12)
    p.loft(0,0,[(.49,r*.81,r*.81),(.70,r,r),(shoulder-.16,r,r),(shoulder,r*.88,r*.88)],2,16)
    p.loft(0,0,[(shoulder,r*.88,r*.88),(shoulder+.27,r*.67,r*.67),(shoulder+.63,r*.27,r*.27),(shoulder+.77,.025,.025)],5,16)
    for z in (.76,shoulder-.22): p.ring((0,0,z),(r+.025,r+.025),(r-.02,r-.02),.08,4 if LEVEL>=3 else 3,16)
    if LEVEL>=3: p.ring((0,0,shoulder*.60),(r+.03,r+.03),(r-.02,r-.02),.085,4,16)
    # Four thick fins terminate on the launch pad; no unsupported decorative feet.
    for i in range(4):
        a=math.tau*i/4; start=len(p.verts)
        p.extrude(-.045,.045,[(r*.78,.46),(r*.78,1.29),(r+.33,.50),(r+.33,0),(r+.16,0)],5)
        q=Quaternion((0,0,1),a); p.verts[start:]=[tuple(q@Vector(v)) for v in p.verts[start:]]
    pipe(p,(0,-r-.028,shoulder*.64),(0,-r-.052,shoulder*.64),.21,6,16)
    crescent(p,0,-r-.074,shoulder*.65,.15,4 if LEVEL==4 else 2)
    # A raised wave stripe below the moon badge echoes the sea without text.
    for x,h in ((-.19,.07),(-.09,.15),(.01,.21),(.11,.11),(.20,.05)):
        p.box((x,-r-.008,shoulder*.40+h/2),(.065,.055,h),6)
    if LEVEL>=3:
        for x in (-.76,.76):
            p.loft(x,0,[(.30,.20,.20),(.50,.23,.23),(shoulder*.67,.23,.23),(shoulder*.67+.24,.11,.11),(shoulder*.67+.37,.018,.018)],5,12)
            for z in (.65,shoulder*.60): p.ring((x,0,z),(.25,.25),(.21,.21),.085,4 if LEVEL==4 else 3,12)
            beam(p,(x,0,.96),(math.copysign(r-.03,x),0,.96),.14,.14,3)
    p.finish()
    flame=empty('Luna_Exhaust',(0,0,.24),rocket); flame.scale.z=.001
    p=part('Thruster_Plume',flame)
    p.loft(0,0,[(-1,.015,.015),(-.38,.18,.18),(0,.22,.22)],8,10)
    p.loft(0,0,[(-.50,.015,.015),(-.18,.10,.10),(.003,.13,.13)],2,10); p.finish()
    tx,ty=-1.98,.98; tower_top=[3.12,3.77,4.52,5.20][LEVEL-1]
    p=part('Launch_Gantry'); stages=[3,4,5,5][LEVEL-1]
    for x in (-.30,.30):
        for y in (-.30,.30): p.box((tx+x,ty+y,(.30+tower_top)/2),(.11,.11,tower_top-.30),1)
    for i in range(stages):
        lo=.30+i*(tower_top-.30)/stages; hi=.30+(i+1)*(tower_top-.30)/stages
        for side in (-1,1):
            beam(p,(tx-.30,ty+side*.30,lo),(tx+.30,ty+side*.30,hi),.065,.065,4 if LEVEL>=3 else 3)
            beam(p,(tx+side*.30,ty-.30,lo),(tx+side*.30,ty+.30,hi),.065,.065,1)
        p.box((tx,ty,hi),(.76,.76,.085),4 if LEVEL>=3 else 3)
    for z in (tower_top*.53,tower_top):
        p.box((tx+.57,ty,z),(1.15,.67,.10),3)
        rail(p,(tx-.35,ty-.35),(tx+1.12,ty-.35),z+.05)
        rail(p,(tx-.35,ty+.35),(tx+1.12,ty+.35),z+.05)
        rail(p,(tx+1.12,ty-.35),(tx+1.12,ty+.35),z+.05)
        beam(p,(tx+.30,ty,z-.48),(tx+1.02,ty,z-.05),.07,.08,1)
    lamp(p,tx,ty,tower_top+.05); p.finish()
    p=part('Tower_Ladder')
    for x in (tx-.22,tx+.22): pipe(p,(x,ty+.42,.30),(x,ty+.42,tower_top+.36),.028,3)
    for i in range(math.ceil((tower_top-.30)/.25)): pipe(p,(tx-.22,ty+.42,.40+i*.25),(tx+.22,ty+.42,.40+i*.25),.025,4)
    p.finish()
    dx,dy=1.43,.27; dome_r=[.64,.72,.81,.88][LEVEL-1]; dome_base=1.36
    p=part('Ocean_Observatory'); p.box((dx,dy,.79),(1.82,1.72,.98),2); p.box((dx,dy,1.31),(1.94,1.84,.10),1); p.finish(.035)
    p=part('Observatory_Doors')
    p.box((dx,dy-.875,.82),(.62,.06,.86),1); p.box((dx,dy-.917,.83),(.49,.025,.73),3)
    p.box((dx,dy-.935,1.04),(.35,.025,.24),7); p.box((dx+.16,dy-.956,.72),(.03,.02,.11),4)
    for z in (.57,.73,.89): p.box((dx+.925,dy+.18,z),(.035,.66,.062),3)
    p.box((dx,dy+.877,.83),(.58,.035,.72),1); p.box((dx,dy+.90,.83),(.44,.025,.56),3)
    p.box((dx,dy-.96,.36),(.94,.31,.12),2); p.finish()
    p=part('Faceted_Sea_Dome')
    p.loft(dx,dy,[(dome_base,dome_r,dome_r)]+[(dome_base+dome_r*math.sin(a),dome_r*math.cos(a),dome_r*math.cos(a)) for a in (.30,.60,.90,1.20,1.48)],6,16)
    for a in (0,.60,1.20):
        rr=dome_r*math.cos(a)+.012; p.ring((dx,dy,dome_base+dome_r*math.sin(a)),(rr,rr),(rr-.025,rr-.025),.035,4 if LEVEL==4 else 7,16)
    for i in range(6 if LEVEL<3 else 8):
        angle=i*math.tau/(6 if LEVEL<3 else 8)
        pts=[(dx+(dome_r+.006)*math.cos(a)*math.cos(angle),dy+(dome_r+.006)*math.cos(a)*math.sin(angle),dome_base+(dome_r+.006)*math.sin(a)) for a in (0,.30,.60,.90,1.20,1.48)]
        for a,b in zip(pts,pts[1:]): pipe(p,a,b,.025,7,6)
    p.finish()
    top=dome_base+dome_r*math.sin(1.48); p=part('Antenna_Bearing'); p.cylinder((dx,dy,top+.07),.14,.14,3,12); p.finish()
    dish=empty('Luna_Dish',(dx,dy,top+.14)); p=part('Moon_Tracking_Dish',dish)
    p.cylinder((0,0,.11),.07,.22,4,10)
    start=len(p.verts); rr=.27 if LEVEL<3 else .35
    p.loft(0,0,[(0,.03,.03),(.04,.10,.10),(.19,rr,rr),(.24,rr,rr),(.22,rr-.045,rr-.045),(.085,.07,.07)],2,16)
    q=Quaternion((0,1,0),.50); p.verts[start:]=[tuple(q@Vector(v)+Vector((0,0,.22))) for v in p.verts[start:]]
    pipe(p,(0,0,.28),(.17,0,.63),.022,4,8); p.cylinder((.17,0,.64),.05,.06,7,8); p.finish()
    if LEVEL>=2:
        p=part('Cryogenic_Fuel_Supply')
        for x in (-.72,.02):
            p.loft(x,1.70,[(.30,.26,.26),(.43,.30,.30),(1.43,.30,.30),(1.60,.15,.15)],2,12)
            for z in (.56,1.33): p.ring((x,1.70,z),(.32,.32),(.29,.29),.07,4 if LEVEL>=3 else 3,12)
            p.cylinder((x,1.70,1.65),.10,.10,6,10)
        pipe(p,(-.72,1.70,1.73),(.02,1.70,1.73),.055)
        pipe(p,(.02,1.70,.74),(.02,1.17,.74),.075)
        pipe(p,(.02,1.17,.74),(cx,1.17,.74),.075)
        pipe(p,(cx,1.17,.74),(cx,.69,.74),.075)
        # Fuel manifold is mounted on the pad edge, clear of the rocket's flight cylinder.
        p.box((cx,.69,.55),(.37,.30,.50),1); p.box((cx,.52,.62),(.24,.035,.16),7); p.finish()
    p=part('Perimeter_Details')
    for x,y in ([(-2.35,-1.96),(2.35,1.94)] if LEVEL<3 else [(-2.35,-1.96),(2.35,1.94),(-2.35,1.94),(2.35,-1.96)]): lamp(p,x,y,.30)
    if LEVEL>=3:
        for x in (-2.51,2.51): rail(p,(x,-1.53),(x,1.55),.30)
        p.box((1.42,-1.42,.53),(1.28,.60,.46),1)
        p.box((1.42,-1.42,.79),(1.34,.64,.06),4)
        for x in (1.04,1.42,1.80): p.box((x,-1.738,.59),(.22,.028,.14),7)
        # A tiny salmon parcel waits in the moon cargo locker.
        p.box((1.42,-1.42,.90),(.55,.30,.16),2); p.box((1.42,-1.42,1.01),(.62,.33,.09),5)
        for x in (1.23,1.42,1.61): p.box((x,-1.42,1.063),(.028,.27,.015),2)
    p.finish()
    if LEVEL==4:
        p=part('Golden_Moon_Column')
        p.box((.31,1.58,2.75),(.22,.22,4.90),1)
        # The crescent rests directly on the right column; the overhead braces are gone.
        crescent(p,.31,1.58,5.68,.50,4)
        lamp(p,tx,ty,5.25)
        # Gold strips add readable relief to the booster-era gantry.
        for z in (1.10,2.10,3.10,4.10): p.box((.31,1.477,z),(.22,.035,.15),4)
        p.finish()
    world=bpy.data.worlds.new(f'Luna{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    data=bpy.data.cameras.new('Luna_Preview_Camera'); data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); data.ortho_scale=11.2
    camera=bpy.data.objects.new('Luna_Preview_Camera',data); rig.objects.link(camera); scene.camera=camera
    for name,loc,energy,size in [('Key',(-3,-4,8),800,5),('Fill',(5,-2,6),400,4),('Rim',(1,5,8),750,4)]:
        data=bpy.data.lights.new(name,next(i.identifier for i in bpy.types.Light.bl_rna.properties['type'].enum_items if i.identifier=='AREA')); data.energy=energy; data.size=size
        light=bpy.data.objects.new(name,data); rig.objects.link(light); light.location=loc; light.rotation_euler=(Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
    try: scene.render.engine='BLENDER_EEVEE'
    except TypeError: raise RuntimeError('EEVEE renderer unavailable')
    scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100; scene.render.film_transparent=True
    scene.render.image_settings.file_format=next(i.identifier for i in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items if i.identifier=='PNG')
    scene.render.image_settings.color_mode=next(i.identifier for i in scene.render.image_settings.bl_rna.properties['color_mode'].enum_items if i.identifier=='RGBA')

bpy.context.window.scene=scene; model=next(c for c in scene.collection.children if c.name.endswith('_MODEL')); camera=scene.camera
camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.8))-camera.location).to_track_quat('-Z','Y').to_euler(); bpy.context.view_layer.update()
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
        camera.location=loc; camera.rotation_euler=(Vector((0,0,2.8))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.render.filepath=str(OUT/(name+'.png')); bpy.ops.render.render(write_still=True)
    camera.location=(7,-10,7); camera.rotation_euler=(Vector((0,0,2.8))-camera.location).to_track_quat('-Z','Y').to_euler()
    bpy.data.libraries.write(str(OUT/f'luna-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.name!=f'Luna_L{LEVEL}_ROOT']; static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Luna_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Luna_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True); selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Luna_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected: o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/07-luna-sea'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'luna-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
