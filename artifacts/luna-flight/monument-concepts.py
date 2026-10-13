"""Disposable Blender comparison; restores the production scene after rendering."""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector, Quaternion
sys.path.insert(0,'D:/Sushi_Loopy/scripts')
from blender_parts import Part

scene=bpy.data.scenes['SL_07_Luna_L4_v01']; bpy.context.window.scene=scene
old=next(o for o in scene.objects if o.name.startswith('Golden_Moon_Column'))
names=['Stone','Navy','Ivory','Steel','Gold','Red','Sea','Ice','Light']
available={m.name.split('.')[0].split('_',1)[-1]:m for o in scene.objects if o.type=='MESH' for m in o.data.materials}
mats=[available[n] for n in names]; output=Path('D:/Sushi_Loopy/artifacts/luna-flight'); output.mkdir(exist_ok=True)

def moon(p,x,y,z,r,color,depth=.04,inset=0):
    d=r*.55; outer=r-inset; inner=r+inset
    ix=(d*d+outer*outer-inner*inner)/(2*d); h=math.sqrt(outer*outer-ix*ix)
    a=math.atan2(h,ix); b=math.atan2(h,ix-d)
    outline=[(outer*math.cos(t),outer*math.sin(t)) for t in [a+(math.tau-2*a)*i/16 for i in range(17)]]
    outline += [(d+inner*math.cos(t),inner*math.sin(t)) for t in [math.tau-b-(math.tau-2*b)*i/14 for i in range(1,14)]]
    n=len(outline); p.poly([(x+xx,yy,z+zz) for yy in (y-depth,y+depth) for xx,zz in outline],
        [tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],color)

def sphere(p,x,y,z,r,color):
    p.loft(x,y,[(z+r*math.sin(a),max(.012,r*math.cos(a)),max(.012,r*math.cos(a))) for a in [-math.pi/2+i*math.pi/10 for i in range(11)]],color,16)

def vertical(p,fn):
    start=len(p.verts); fn(); q=Quaternion((1,0,0),math.pi/2)
    p.verts[start:]=[tuple(q@Vector(v)+Vector((.68,1.8,5.66))) for v in p.verts[start:]]

old_hidden=old.hide_render; old_path=scene.render.filepath
try:
    old.hide_render=True
    for option in 'ABC':
        collection=bpy.data.collections.new('Moon_Concept_'+option); scene.collection.children.link(collection)
        p=Part('Concept_'+option,mats,collection,old.parent)
        p.box((.68,1.8,.38),(.65,.65,.16),0)
        p.loft(.68,1.8,[(.46,.27,.27),(.78,.24,.24),(4.7,.15,.15),(5.03,.19,.19)],1,8)
        for z,r in ((.63,.29),(3.1,.19),(4.91,.25)): p.cylinder((.68,1.8,z),r,.13,4,8)
        if option=='A':
            moon(p,.68,1.8,5.64,.64,4,.16)
            for dy in (-.163,.163): moon(p,.68,1.8+dy,5.64,.64,2,.012,.060)
        elif option=='B':
            sphere(p,.68,1.8,5.62,.57,2)
            vertical(p,lambda:p.ring((0,0,0),(.72,.72),(.66,.66),.085,4,28))
            for x,z,r in ((-.19,.18,.10),(.17,-.12,.15),(-.20,-.22,.07)):
                vertical(p,lambda x=x,z=z,r=r:p.cylinder((x,z,.55),r,.035,0,10))
        else:
            vertical(p,lambda:p.cylinder((0,0,0),.66,.20,1,24))
            vertical(p,lambda:p.ring((0,0,.10),(.68,.68),(.57,.57),.10,4,24))
            moon(p,.62,1.66,5.69,.43,2,.035)
            for z in (5.2,6.1):p.box((.68,1.65,z),(.11,.08,.11),4)
        p.finish(.025)
        scene.render.filepath=str(output/f'monument-{option}.png'); bpy.ops.render.render(write_still=True)
        for obj in list(collection.objects):
            mesh=obj.data; bpy.data.objects.remove(obj,do_unlink=True); bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(collection)
finally:
    old.hide_render=old_hidden; scene.render.filepath=old_path
print('Rendered monument A/B/C; original scene restored')
