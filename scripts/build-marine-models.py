"""Blender MCP: LEVEL=1..4, FINAL=True saves the editable scene, GLB and four views."""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
OUT=REPO/f'assets/models/04-marine-food-plant/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_04_Plant_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Plant_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Plant_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Plant_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='marine_food_plant'; root['level']=LEVEL
    palette=[('Stone',(.38,.40,.35)),('Navy',(.025,.095,.16)),('Ivory',(.83,.78,.63)),
             ('Steel',(.25,.34,.37)),('Gold',(.85,.48,.10)),('Vermilion',(.75,.105,.035)),
             ('Blue',(.035,.32,.57)),('Ice',(.39,.78,.81)),('Timber',(.46,.25,.10))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'M{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.36 if name in ('Steel','Gold','Blue') else .73
        bsdf.inputs['Metallic'].default_value=.55 if name=='Gold' else .35 if name=='Steel' else .05
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
    def fish(p,x,y,z,size,color):
        # Raised, closed silhouette in the XZ plane. No image or transparent material.
        outline=[(-.55,0),(-.31,.23),(.1,.30),(.42,.17),(.54,0),(.42,-.16),(.1,-.25),(-.31,-.2)]
        verts=[(x+a*size,yy,z+b*size) for yy in (y-.045,y+.045) for a,b in outline]
        p.poly(verts,[tuple(range(7,-1,-1)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],color)
        p.poly([(x+a*size,yy,z+b*size) for yy in (y-.04,y+.04) for a,b in [(-.48,0),(-.84,.27),(-.84,-.25)]],[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],color)
        pipe(p,(x+.25*size,y-.051,z+.055*size),(x+.25*size,y-.07,z+.055*size),.048*size,1,8)
    def crate(name,x,y,z,size=.7,ice=True,parent=root):
        p=part(name,parent); p.box((x,y,z+.055),(size,size,.11),8)
        for side in (-1,1):
            p.box((x+side*(size/2-.045),y,z+.25),(.09,size,.4),6)
            p.box((x,y+side*(size/2-.045),z+.25),(size-.18,.09,.4),6)
        for dz in (.13,.35):
            for side in (-1,1): p.box((x,y+side*size/2,z+dz),(size,.025,.045),4 if LEVEL==4 else 2)
        p.box((x,y,z+.31),(size-.18,size-.18,.08),7)
        if ice:
            for dx,dy in [(-.17,-.13),(.13,-.12),(0,.15)]: p.loft(x+dx,y+dy,[(z+.35,.11,.10),(z+.46,.06,.07)],7,5)
            p.loft(x,y,[(z+.34,.09,.20),(z+.45,.06,.14),(z+.53,.035,.06)],3,8)
        return p.finish()
    def rail(p,a,b,z,color=3):
        for x,y in (a,b): pipe(p,(x,y,z),(x,y,z+.40),.033,color,8)
        pipe(p,(*a,z+.40),(*b,z+.40),.027,color,8)
    def ladder(p,x,y,z0,z1):
        for dx in (-.22,.22): pipe(p,(x+dx,y,z0),(x+dx,y,z1),.035,3,8)
        for i in range(math.ceil((z1-z0)/.24)): pipe(p,(x-.22,y,z0+i*.24),(x+.22,y,z0+i*.24),.025,4,8)
    p=part('Harbor_Foundation'); p.box((0,0,.15),(5.5,4.65,.30),0); p.finish(.11)
    p=part('Dock_Edges')
    for x in (-2.38,2.38):
        for y in (-1.99,1.99):
            p.cylinder((x,y,.41),.10,.24,1,8); p.cylinder((x,y,.54),.16,.06,4 if LEVEL>=3 else 3,8)
    for x in (-1.72,0,1.72): p.box((x,-2.30,.17),(.07,.035,.18),1)
    p.box((-.50,-1.63,.36),(2.45,.72,.12),2)
    for x in (-1.38,-.78,-.18,.42): p.box((x,-1.66,.426),(.29,.51,.012),4)
    p.finish()
    p=part('Cold_Store'); p.box((-.57,.42,.94),(3.22,2.56,1.28),2); p.box((-.57,.42,1.62),(3.42,2.75,.12),1); p.finish(.035)
    p=part('Doors_And_Controls')
    p.box((-.92,-.895,.89),(1.20,.12,1.08),1)
    for z in (.46,.59,.72,.85,.98,1.11,1.24): p.box((-.92,-.97,z),(.99,.035,.09),3)
    p.box((.39,-.95,1.05),(.54,.13,.47),1); p.box((.39,-1.024,1.12),(.37,.026,.18),7)
    for x,c in ((.25,5),(.48,4)): p.box((x,-1.03,.92),(.11,.03,.07),c)
    p.box((-.85,1.71,.95),(.66,.05,1.02),1); p.box((-.85,1.742,.95),(.54,.035,.89),3)
    p.box((-.67,1.77,.97),(.035,.035,.15),4)
    for z in (.7,.85,1.0,1.15): p.box((-2.197,.52,z),(.035,.8,.075),3)
    fish(p,-.95,-.993,1.41,.22,4); p.finish()
    tank_specs=[(-.75,.40,.78,2.78)] if LEVEL==1 else [(-1.18,.62,.69,3.24),(.39,.69,.62,3.06)] if LEVEL==2 else [(-1.19,.88,.74,3.85),(.43,1.01,.67,3.59),(-.35,-.51,.66,3.05)]
    if LEVEL==4: tank_specs=[(-1.15,.87,.79,4.25),(.52,1.02,.68,3.94),(-.34,-.50,.69,3.32)]
    for i,(x,y,r,h) in enumerate(tank_specs):
        p=part(f'Tank_{i+1}'); p.loft(x,y,[(1.68,r*.83,r*.83),(1.83,r,r),(h-.25,r,r),(h-.07,r*.72,r*.72),(h,r*.24,r*.24)],6,16)
        for z in ((1.88,(1.88+h-.29)/2,h-.29) if LEVEL==4 else (1.88,h-.29)): p.ring((x,y,z),(r+.028,r+.028),(r-.006,r-.006),.07,4 if LEVEL>=3 else 3,16)
        p.cylinder((x,y,h+.045),r*.19,.09,3,12)
        fish(p,x,y-r-.018,(1.83+h-.25)/2,r*.61,2 if LEVEL<4 else 4)
        p.finish()
    p=part('Manifold')
    top=max(t[3] for t in tank_specs)+.20
    # Chamfered pipe corners make the pipe continuous without detailed elbow meshes.
    points=[(-2.32,.97,.80),(-2.32,.97,top-.22),(-2.12,.97,top),(.94,.97,top),(1.12,.97,top-.18),(1.12,.97,1.01)]
    for a,b in zip(points,points[1:]): pipe(p,a,b,.115)
    for x,y,r,h in tank_specs:
        pipe(p,(x,y,h+.09),(x,y,top),.075)
        if abs(y-.97)>.02: pipe(p,(x,y,top),(x,.97,top),.075)
    for x in (-1.78,-.55,.64): pipe(p,(x-.035,.97,top),(x+.035,.97,top),.16,4 if LEVEL>=3 else 1,12)
    pipe(p,(-2.32,.97,.80),(-2.32,-.20,.80),.115)
    pipe(p,(-2.32,-.20,.80),(-2.12,-.20,.80),.115)
    pipe(p,(1.12,.97,1.01),(.96,.97,1.01),.115)
    p.finish()
    valve=empty('Plant_Valve',(-2.46,-.20,.80)); valve.rotation_euler.y=-math.pi/2
    p=part('Valve_Wheel',valve); p.ring((0,0,0),(.23,.23),(.185,.185),.055,5,12); p.cylinder((0,0,0),.065,.16,4,10)
    for a in (0,math.tau/3,2*math.tau/3): beam(p,(0,0,0),(.2*math.cos(a),.2*math.sin(a),0),.035,.035,5)
    p.finish()
    crane_top=[2.65,3.37,4.15,5.10][LEVEL-1]; crane_x=1.87; load_y=-1.37
    p=part('Red_Harbor_Crane'); p.cylinder((crane_x,.50,.43),.39,.26,1,12)
    p.cylinder((crane_x,.50,.71),.26,.30,4,12); p.box((crane_x,.50,(crane_top+.85)/2),(.30,.34,crane_top-.85),5)
    p.box((crane_x,-.51,crane_top),(.34,2.38,.25),5)
    beam(p,(crane_x,.50,crane_top-.83),(crane_x,-.98,crane_top-.12),.12,.15,5)
    pipe(p,(crane_x-.22,-1.37,crane_top),(crane_x+.22,-1.37,crane_top),.16,4,12)
    if LEVEL>=3:
        p.box((crane_x,.91,crane_top-.22),(.74,.65,.44),1)
        for z in (.94,1.16,1.38): p.box((crane_x,-.001,z),(.32,.025,.07),4)
        ladder(p,crane_x,.735,.85,crane_top-.27)
    if LEVEL==4:
        p.box((-2.02,1.85,2.56),(.20,.20,4.52),5)
        beam(p,(-2.02,1.85,4.75),(crane_x,.50,5.10),.25,.25,5)
        beam(p,(-2.02,1.85,3.95),(-1.15,1.55,4.86),.13,.13,4)
        for z in (1.15,2.20,3.25,4.30): p.box((-2.02,1.732,z),(.25,.035,.13),4)
    p.finish()
    hoist=empty('Plant_Hoist',(crane_x,load_y,1.0)); crate('Fish_Cargo',0,0,0,.68,True,hoist)
    p=part('Cargo_Slings',hoist)
    for dx in (-.28,.28):
        for dy in (-.28,.28): pipe(p,(dx,dy,.40),(0,0,.85),.015,1,6)
    p.cylinder((0,0,.89),.065,.12,4,8); p.finish()
    cable=empty('Plant_Cable',(crane_x,load_y,(crane_top-.14+1.95)/2)); cable.scale.z=crane_top-.14-1.95
    p=part('Hoist_Rope',cable); p.cylinder((0,0,0),.018,1,1,6); p.finish()
    cable['anchor_z']=crane_top-.14; hoist['sling_height']=.95
    crate('Waiting_Crate',.73,-1.71,.30,.60)
    if LEVEL>=2:
        crate('Export_Crate',-1.97,-1.68,.30,.57)
        p=part('Pump_Station'); p.box((1.87,1.46,.72),(.77,.85,.84),2); p.cylinder((1.87,1.46,1.26),.28,.26,6,12)
        pipe(p,(1.87,1.46,1.42),(1.12,1.46,1.42),.09); pipe(p,(1.12,1.46,1.42),(1.12,.97,1.42),.09)
        p.box((1.87,1.46,1.46),(.37,.39,.10),3); p.finish()
    if LEVEL>=3:
        p=part('Service_Deck'); p.box((-.55,1.99,1.68),(3.54,.40,.12),3)
        rail(p,(-2.25,2.18),(-.85,2.18),1.74,4); rail(p,(-.22,2.18),(1.12,2.18),1.74,4)
        ladder(p,-.55,2.22,.34,2.12)
        p.box((-.57,-.83,1.68),(3.47,.09,.12),4)
        for x in (-1.98,.94): p.box((x,-.87,.95),(.10,.11,1.21),4)
        p.finish()
    if LEVEL==4:
        p=part('Admiral_Crest')
        for x in (-1.25,.3):
            pipe(p,(x,1.36,3.68),(x,1.36,4.53),.055,4)
            pipe(p,(x,1.36,4.53),(x,.05,4.53),.055,4)
        p.box((-.45,.05,4.57),(2.75,.24,.17),4)
        start=len(p.verts); p.ring((0,0,0),(1.02,.70),(.94,.62),.11,4,24)
        p.verts[start:]=[(x-.40,.05-z,y+5.20) for x,y,z in p.verts[start:]]
        fish(p,-.28,-.04,5.20,1.18,4)
        # The gold fish sits on a real support, including when seen from behind.
        p.box((-.40,.05,4.84),(.07,.08,.46),4)
        for x in (-1.72,.82): p.loft(x,.05,[(4.67,.08,.08),(4.93,.18,.13),(5.18,.025,.025)],7,8)
        p.finish()
        beacon=empty('Plant_Beacon',(crane_x,.50,5.48))
        p=part('Beacon_Cap',beacon); p.cylinder((0,0,0),.21,.30,4,12)
        for x in (-.20,.20): p.box((x,0,0),(.025,.16,.16),7)
        p.finish()
        p=part('Beacon_Stand'); p.cylinder((crane_x,.50,5.27),.14,.17,1,12); p.loft(crane_x,.50,[(5.65,.26,.26),(5.82,.06,.06)],4,12); p.finish()
    world=bpy.data.worlds.new(f'Plant{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    data=bpy.data.cameras.new('Plant_Preview_Camera'); data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); data.ortho_scale=10.2
    camera=bpy.data.objects.new('Plant_Preview_Camera',data); rig.objects.link(camera); scene.camera=camera
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
    bpy.data.libraries.write(str(OUT/f'marine-plant-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.name!=f'Plant_L{LEVEL}_ROOT']; static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Plant_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Plant_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True); selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Plant_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected: o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/04-marine-food-plant'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'marine-plant-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
