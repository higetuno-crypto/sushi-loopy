"""Shared low-poly mesh construction for the facility authoring scripts."""
import bpy
import bmesh
import math

class Part:
    def __init__(self,name,mats,collection,parent):
        self.mats=mats; self.collection=collection; self.parent=parent; self.name=name; self.verts=[]; self.faces=[]; self.colors=[]
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
        for i in used: mesh.materials.append(self.mats[i])
        for face,color in zip(mesh.polygons,self.colors): face.material_index=used.index(color)
        bm=bmesh.new(); bm.from_mesh(mesh)
        if bevel:
            bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=1,affect='EDGES',clamp_overlap=True)
            bmesh.ops.dissolve_degenerate(bm,dist=1e-6,edges=list(bm.edges))
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free(); mesh.update()
        obj=bpy.data.objects.new(self.name,mesh); self.collection.objects.link(obj); obj.parent=self.parent
        return obj
