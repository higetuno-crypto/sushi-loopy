"""Blender MCP: LEVEL=1..4, FINAL=True saves the editable scene, GLB and four views."""
import bpy, bmesh, math, json, sys, io_scene_gltf2
from pathlib import Path
from mathutils import Vector

REPO=Path(__file__).resolve().parents[1]
if str(REPO/'scripts') not in sys.path: sys.path.insert(0,str(REPO/'scripts'))
from blender_parts import Part
LEVEL=globals().get('LEVEL',1); FINAL=globals().get('FINAL',False)
OUT=REPO/f'assets/models/05-sushi-ocean-mining/lv{LEVEL}'; OUT.mkdir(parents=True,exist_ok=True)
scene_name=f'SL_05_Mining_L{LEVEL}_v01'; scene=bpy.data.scenes.get(scene_name)
if not scene:
    scene=bpy.data.scenes.new(scene_name); bpy.context.window.scene=scene
    model=bpy.data.collections.new(f'Mining_L{LEVEL}_MODEL'); rig=bpy.data.collections.new(f'Mining_L{LEVEL}_PREVIEW')
    scene.collection.children.link(model); scene.collection.children.link(rig)
    root=bpy.data.objects.new(f'Mining_L{LEVEL}_ROOT',None); model.objects.link(root)
    root['facility_id']='sushi_ocean_mining'; root['level']=LEVEL
    palette=[('Footing',(.29,.33,.31)),('Navy',(.025,.075,.13)),('Ivory',(.83,.78,.63)),
             ('Steel',(.26,.35,.38)),('Gold',(.83,.44,.065)),('Salmon',(.91,.24,.10)),
             ('Crane',(.71,.085,.025)),('Glass',(.095,.47,.53)),('Rice',(.97,.86,.61))]
    mats=[]
    for name,color in palette:
        m=bpy.data.materials.new(f'O{LEVEL}_{name}'); m.use_nodes=True; m.diffuse_color=(*color,1)
        bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        bsdf.inputs['Base Color'].default_value=(*color,1)
        bsdf.inputs['Roughness'].default_value=.38 if name in ('Steel','Gold','Glass') else .72
        bsdf.inputs['Metallic'].default_value=.55 if name=='Gold' else .30 if name=='Steel' else 0
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
    def rail(p,a,b,z,color=4):
        for x,y in (a,b): pipe(p,(x,y,z),(x,y,z+.34),.034,color)
        pipe(p,(*a,z+.34),(*b,z+.34),.028,color)
        pipe(p,(*a,z+.15),(*b,z+.15),.020,color)
    def ladder(p,x,y,z0,z1):
        for dx in (-.20,.20): pipe(p,(x+dx,y,z0),(x+dx,y,z1),.032,4)
        for i in range(math.ceil((z1-z0)/.23)): pipe(p,(x-.20,y,z0+i*.23),(x+.20,y,z0+i*.23),.024,3)
    def ore(p,x,y,z,size):
        p.loft(x,y,[(z,.30*size,.25*size),(z+.13*size,.37*size,.28*size),(z+.40*size,.18*size,.18*size),(z+.53*size,.035*size,.05*size)],5,5)
        p.loft(x,y,[(z+.055*size,.32*size,.263*size),(z+.13*size,.373*size,.283*size)],8,5)
    def bin(name,x,y,z,w,d,parent=root):
        p=part(name,parent); p.box((x,y,z+.045),(w,d,.09),1)
        for side in (-1,1):
            p.box((x+side*(w/2-.045),y,z+.21),(.09,d,.33),3)
            p.box((x,y+side*(d/2-.045),z+.21),(w-.18,.09,.33),3)
            p.box((x,y+side*d/2,z+.30),(w,.025,.055),4)
        for dx,dy,size in [(-.22,-.10,.56),(.2,-.10,.64),(0,.14,.78)]: ore(p,x+dx*w,y+dy*d,z+.10,size)
        return p.finish()
    p=part('Four_Pylons')
    for x in (-2.05,2.05):
        for y in (-1.55,1.55):
            p.loft(x,y,[(0,.38,.38),(.15,.38,.38),(.27,.29,.29),(1.30,.29,.29)],1,8)
            for z in (.42,.90): p.ring((x,y,z),(.303,.303),(.27,.27),.15,4 if LEVEL>=3 else 3,8)
            p.cylinder((x,y,1.16),.42,.18,3,8)
    for y in (-1.55,1.55):
        beam(p,(-2.05,y,.70),(2.05,y,1.12),.10,.10,3)
        beam(p,(-2.05,y,1.12),(2.05,y,.70),.10,.10,3)
    p.finish()
    p=part('Perforated_Deck'); outer=[(-2.55,-1.8),(-2.15,-2.15),(2.15,-2.15),(2.55,-1.8),(2.55,1.8),(2.15,2.15),(-2.15,2.15),(-2.55,1.8)]
    cx,cy=-.15,.55; inner=[]
    for x,y in outer:
        v=Vector((x-cx,y-cy)).normalized()*.37; inner.append((cx+v.x,cy+v.y))
    p.poly([(x,y,z) for z,ring in [(1.15,outer),(1.15,inner),(1.39,inner),(1.39,outer)] for x,y in ring],
           [(r*8+i,r*8+(i+1)%8,((r+1)%4)*8+(i+1)%8,((r+1)%4)*8+i) for r in range(4) for i in range(8)],3)
    p.ring((cx,cy,1.42),(.52,.52),(.36,.36),.07,4,16)
    p.ring((cx,cy,.10),(.43,.43),(.27,.27),.20,3,12); p.finish()
    p=part('Deck_Rails')
    for a,b in [((-2.35,-1.6),(-2.35,.1)),((-2.35,.1),(-2.35,1.6)),((-2.1,1.97),(-.60,1.97)),((.05,1.97),(2.10,1.97)),((2.36,1.6),(2.36,.0)),((2.36,0),(2.36,-1.6)),((-2.10,-1.98),(-.8,-1.98)),((-.8,-1.98),(.8,-1.98)),((1.65,-1.98),(2.10,-1.98))]: rail(p,a,b,1.39,4 if LEVEL>=2 else 3)
    ladder(p,1.25,-2.08,.04,1.75); p.finish()
    p=part('Control_Cabin'); p.box((-1.50,-.82,1.90),(1.17,1.15,1.02),2)
    p.box((-1.50,-.82,2.45),(1.32,1.30,.12),1); p.finish(.035)
    p=part('Cabin_Windows_And_Door')
    for x in (-1.83,-1.48): p.box((x,-1.404,2.14),(.27,.025,.32),7)
    p.box((-1.50,-1.43,2.34),(1.09,.08,.06),4 if LEVEL>=3 else 3)
    p.box((-1.085,-1.407,1.90),(.20,.035,.86),1); p.box((-1.085,-1.431,2.11),(.14,.025,.26),7)
    p.box((-1.03,-1.452,1.83),(.025,.015,.065),4)
    p.box((-2.093,-.85,2.13),(.035,.75,.33),7)
    for y in (-1.11,-.79,-.47): p.box((-2.117,y,2.13),(.025,.045,.37),2)
    for z in (1.72,1.86,2.00): p.box((-1.55,-.231,z),(.71,.035,.06),3)
    p.finish()
    tower_top=[3.73,4.18,4.65,5.18][LEVEL-1]; stages=[2,3,3,4][LEVEL-1]
    p=part('Lattice_Derrick')
    def corner(side,front,z):
        half=.71-(z-1.39)/(tower_top-1.39)*.39
        return (cx+side*half,cy+front*half,z)
    for sx in (-1,1):
        for sy in (-1,1): beam(p,corner(sx,sy,1.39),corner(sx,sy,tower_top),.12 if LEVEL<3 else .16,.12,1)
    for i in range(stages):
        lo=1.39+i*(tower_top-1.39)/stages; hi=1.39+(i+1)*(tower_top-1.39)/stages
        for sy in (-1,1):
            beam(p,corner(-1,sy,lo),corner(1,sy,hi),.075,.07,4 if LEVEL>=3 else 3)
            beam(p,corner(1,sy,lo),corner(-1,sy,hi),.075,.07,1)
            beam(p,corner(-1,sy,hi),corner(1,sy,hi),.09,.09,1)
        for sx in (-1,1):
            beam(p,corner(sx,-1,lo),corner(sx,1,hi),.07,.07,1)
            beam(p,corner(sx,-1,hi),corner(sx,1,hi),.09,.09,1)
    p.ring((cx,cy,tower_top),(.49,.49),(.19,.19),.12,4 if LEVEL>=3 else 3,12)
    # A collar and crossbar visibly carry the rotating spindle.
    for side in (-1,1): beam(p,(cx+side*.54,cy,2.90),(cx+side*.27,cy,2.90),.17,.20,4)
    p.ring((cx,cy,2.90),(.29,.29),(.135,.135),.35,1,12); p.finish()
    drill=empty('Mining_Drill',(cx,cy,0)); p=part('Spindle_And_Auger',drill)
    p.cylinder((0,0,(tower_top+.19)/2),.12,tower_top-.19,3,12)
    # One closed helical ribbon. The deck has a real hole around its swept radius.
    verts=[]; turns=3; steps=54
    for i in range(steps+1):
        a=i/steps*math.tau*turns; z=.25+i/steps*2.15
        verts.extend((r*math.cos(a),r*math.sin(a),z+dz) for r,dz in ((.115,-.035),(.25,-.035),(.25,.035),(.115,.035)))
    p.poly(verts,[(3,2,1,0),tuple(steps*4+i for i in range(4))]+[(i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j) for i in range(steps) for j in range(4)],4)
    p.loft(0,0,[(.10,.035,.035),(.27,.14,.14)],3,10); p.finish()
    bin('Salmon_Ore_Hopper',.15,-1.18,1.39,1.33,.91)
    crane_top=[3.24,3.67,4.08,4.55][LEVEL-1]; crane_x=1.72; load_x=1.78; load_y=-1.17
    p=part('Mining_Crane')
    p.cylinder((crane_x,.49,1.52),.34,.26,1,12); p.box((crane_x,.49,1.97),(.30,.32,.66),6)
    pivot=(crane_x,.49,2.26); tip=(load_x,load_y,crane_top)
    for offset in (-.13,.13): beam(p,(pivot[0]+offset,*pivot[1:]),(tip[0]+offset,*tip[1:]),.10,.13,6)
    pipe(p,(crane_x-.24,.49,2.26),(crane_x+.24,.49,2.26),.18,4,12)
    pipe(p,(load_x-.24,load_y,crane_top),(load_x+.24,load_y,crane_top),.17,4,12)
    beam(p,(crane_x,.49,1.81),(load_x,-.41,(2.26+crane_top)/2),.095,.095,3)
    for f in (.25,.5,.75):
        center=Vector(pivot).lerp(Vector(tip),f); pipe(p,center+Vector((-.15,0,0)),center+Vector((.15,0,0)),.045,6)
    p.box((crane_x,.78,2.19),(.52,.51,.33),1); p.finish()
    hoist=empty('Mining_Hoist',(load_x,load_y,1.79)); bin('Suspended_Ore',0,0,0,.66,.62,hoist)
    p=part('Ore_Slings',hoist)
    for x in (-.27,.27):
        for y in (-.25,.25): pipe(p,(x,y,.30),(0,0,.67),.017,1,6)
    p.cylinder((0,0,.72),.06,.12,4,8); p.finish()
    anchor=crane_top-.12; sling=.78
    cable=empty('Mining_Cable',(load_x,load_y,(anchor+1.79+sling)/2)); cable.scale.z=anchor-1.79-sling
    cable['anchor_z']=anchor; hoist['sling_height']=sling
    p=part('Mining_Rope',cable); p.cylinder((0,0,0),.018,1,1,6); p.finish()
    if LEVEL>=2:
        p=part('Pump_And_Reservoirs')
        for x,y,h in ([(-1.78,1.15,2.35)] if LEVEL==2 else [(-1.78,1.15,2.70),(1.77,1.38,2.50)]):
            p.loft(x,y,[(1.39,.33,.33),(h-.12,.33,.33),(h,.23,.23)],1,12)
            for z in (1.53,h-.22): p.ring((x,y,z),(.35,.35),(.32,.32),.09,4,12)
            pipe(p,(x,y,h),(x,y,h+.18),.075); pipe(p,(x,y,h+.18),(cx,y,h+.18),.075)
            pipe(p,(cx,y,h+.18),(cx,cy,h+.18),.075)
        p.box((-.85,1.44,1.68),(.47,.6,.58),2); p.box((-.85,1.13,1.79),(.30,.025,.19),7); p.finish()
    if LEVEL>=3:
        p=part('Upper_Service_Deck'); z=tower_top-.25
        p.box((cx,1.30,z),(1.38,.51,.12),3)
        for side in (-1,1):
            beam(p,corner(side,1,z-.43),(cx+side*.56,1.53,z-.05),.07,.07,1)
            rail(p,(cx+side*.68,1.05),(cx+side*.68,1.52),z+.06)
        rail(p,(cx-.68,1.52),(cx-.28,1.52),z+.06); rail(p,(cx+.28,1.52),(cx+.68,1.52),z+.06)
        ladder(p,cx,1.55,1.39,z+.39)
        p.box((-1.50,-.82,2.55),(1.35,1.33,.08),4)
        for x in (-1.92,-1.08): pipe(p,(x,-.82,2.59),(x,-.82,2.70),.04,3)
        p.box((-1.50,-.82,2.75),(.95,.62,.13),7)
        for x in (-2.05,2.05):
            for y in (-1.55,1.55):
                p.cylinder((x,y,1.69),.14,.60,1,10)
                p.loft(x,y,[(1.99,.10,.10),(2.18,.065,.065),(2.23,.035,.035)],4,10)
        p.finish()
    if LEVEL==4:
        p=part('Imperial_Crown')
        for i in range(6):
            a=i*math.tau/6; x=cx+.72*math.cos(a); y=cy+.72*math.sin(a)
            p.loft(x,y,[(tower_top+.05,.06,.06),(tower_top+.40,.11,.11),(tower_top+.69,.025,.025)],4,5)
            beam(p,(cx+.35*math.cos(a),cy+.35*math.sin(a),tower_top+.02),(x,y,tower_top+.02),.09,.09,4)
        p.ring((cx,cy,tower_top+.08),(.85,.85),(.58,.58),.11,4,16)
        for x in (-2.05,2.05):
            for y in (-1.55,1.55): p.ring((x,y,1.06),(.35,.35),(.28,.28),.08,4,8)
        p.finish()
        crown=empty('Mining_Crown',(cx,cy,tower_top+.19)); p=part('Legendary_Sushi_Ore',crown)
        p.cylinder((0,0,-.08),.20,.20,3,12); ore(p,0,0,0,1.4); p.finish()
        p=part('Twin_Boom_Truss')
        for offset in (-.23,.23):
            beam(p,(crane_x+offset,.58,2.23),(load_x+offset,load_y,crane_top),.075,.075,4)
            for f in (.25,.5,.75):
                a=Vector(pivot).lerp(Vector(tip),f); a.x+=offset
                b=Vector(pivot).lerp(Vector(tip),f+.16); b.x-=offset
                beam(p,a,b,.065,.06,6)
        p.finish()
    world=bpy.data.worlds.new(f'Mining{LEVEL}_World'); world.use_nodes=True
    bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs['Color'].default_value=(.7,.77,.84,1); bg.inputs['Strength'].default_value=.4; scene.world=world
    data=bpy.data.cameras.new('Mining_Preview_Camera'); data.type=next(i.identifier for i in data.bl_rna.properties['type'].enum_items if i.identifier=='ORTHO'); data.ortho_scale=10.2
    camera=bpy.data.objects.new('Mining_Preview_Camera',data); rig.objects.link(camera); scene.camera=camera
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
    bpy.data.libraries.write(str(OUT/f'ocean-mining-lv{LEVEL}.blend'),{scene},fake_user=True)
    dynamic=[o for o in meshes if o.parent.name!=f'Mining_L{LEVEL}_ROOT']; static=[o for o in meshes if o not in dynamic]
    materials=list(dict.fromkeys(o.data.materials[f.material_index] for o in static for f in o.data.polygons)); vertices=[]; faces=[]; colors=[]
    for o in static:
        offset=len(vertices); vertices.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
        for tri in o.data.loop_triangles:
            faces.append(tuple(offset+i for i in tri.vertices)); colors.append(materials.index(o.data.materials[o.data.polygons[tri.polygon_index].material_index]))
    mesh=bpy.data.meshes.new('Mining_Packed'); mesh.from_pydata(vertices,[],faces)
    for m in materials: mesh.materials.append(m)
    for face,color in zip(mesh.polygons,colors): face.material_index=color
    packed=bpy.data.objects.new(f'Mining_L{LEVEL}',mesh); scene.collection.objects.link(packed)
    for o in bpy.context.selected_objects: o.select_set(False)
    packed.select_set(True); selected=set(dynamic)
    for o in dynamic:
        parent=o.parent
        while parent and parent.name!=f'Mining_L{LEVEL}_ROOT': selected.add(parent); parent=parent.parent
    for o in selected: o.select_set(True)
    bpy.context.view_layer.objects.active=packed
    output=REPO/'public/assets/models/05-sushi-ocean-mining'; output.mkdir(parents=True,exist_ok=True)
    fmt=next(i[0] for i in io_scene_gltf2.get_format_items(scene,bpy.context) if i[0]=='GLB')
    bpy.ops.export_scene.gltf(filepath=str(output/f'ocean-mining-lv{LEVEL}.glb'),export_format=fmt,use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True,export_extras=True)
    bpy.data.objects.remove(packed,do_unlink=True); bpy.data.meshes.remove(mesh)
