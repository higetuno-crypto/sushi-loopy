import * as T from 'three';

// Slot IDs stay stable in Save v6. Coordinates describe the land, not facility types.
export const PLOTS = [[-1,6],[9.5,7.5],[-7,5.4],[-8,-1.7],[-6.8,-9],[6.7,-9],[0,-10],[6.6,-1.7],[-.4,-1.7]] as const;
export const MAIN_SHORE = [
  [-11,7],[-10.5,10],[-8,12.3],[-4.5,12.7],[-1,12.9],[3,12.2],
  [4,10],[4.2,7],[4.3,5.6],[4.5,3.6],[7.5,3.5],[10.3,1.4],
  [10.9,-2],[10.2,-5.4],[10.8,-8.7],[9.5,-12.5],[6.8,-13.8],
  [2.8,-14.2],[-1.6,-14.8],[-5,-14.3],[-8.3,-12.8],[-10.2,-11],
  [-11.7,-7.8],[-11.5,-4.5],[-10.9,-1.5],[-12,1.2],[-11.8,4.2],
] as const;
export const ISLET_SHORE = [[6.4,8.8],[6.8,5.8],[9,4.5],[12.1,4.9],[14,7.2],[14.1,10.6],[12.4,13],[9,13.3],[6.9,11.8]] as const;
export const ROAD_WIDTH = 1.65;
export const ROAD_NODES: readonly (readonly number[])[] = [[-1,11],[9.5,12.3],[-7,11],[-8,2.5],[-6.8,-4.7],[6.7,-4.7],[0,-4.7],[6.6,2.5],[-.4,2.5],[2.6,11],[3.35,2.5],[3.35,-4.7]];
export const ROAD_EDGES = [[2,0],[0,9],[9,1],[3,8],[8,10],[10,7],[4,6],[6,11],[11,5],[9,10],[10,11]] as const;
export const BRIDGE_EDGE = [9,1] as const;

/** Routes use the same edges as the visible road, including the bridge. */
export function deliveryRoute(source: number, destination: number) {
  const queue: number[][]=[[source]],visited=new Set([source]);
  while(queue.length) {
    const path=queue.shift()!,last=path.at(-1)!;
    if(last===destination) {
      const route=new T.CurvePath<T.Vector3>();
      const points=path.map(node=>new T.Vector3(ROAD_NODES[node][0],0,ROAD_NODES[node][1]));
      let previous=points[0];
      for(let i=1;i<points.length-1;i++) {
        const corner=points[i];
        const radius=Math.min(.3,corner.distanceTo(points[i-1])*.2,corner.distanceTo(points[i+1])*.2);
        const before=corner.clone().add(points[i-1].clone().sub(corner).setLength(radius));
        const after=corner.clone().add(points[i+1].clone().sub(corner).setLength(radius));
        route.add(new T.LineCurve3(previous,before));
        route.add(new T.QuadraticBezierCurve3(before,corner,after));previous=after;
      }
      route.add(new T.LineCurve3(previous,points.at(-1)!));
      return route;
    }
    for(const [a,b] of ROAD_EDGES) {
      const next=a===last?b:b===last?a:-1;
      if(next>=0&&!visited.has(next)){visited.add(next);queue.push([...path,next]);}
    }
  }
  throw new Error('Unconnected town plot');
}

type Point = readonly number[];
type FieldParts = {
  root:T.Group;
  box:(parent:T.Object3D,color:string,x:number,y:number,z:number,w:number,h:number,d:number)=>T.Mesh;
  cyl:(parent:T.Object3D,color:string,x:number,y:number,z:number,r:number,h:number)=>T.Mesh;
  ball:(parent:T.Object3D,color:string,x:number,y:number,z:number,r:number)=>T.Mesh;
  tree:(x:number,z:number,pink?:boolean)=>void;
  material:(color:string)=>T.MeshStandardMaterial;
  geometries:Set<T.BufferGeometry>;
};

export function buildField({root,box,cyl,ball,tree,material,geometries}:FieldParts) {
  function land(points:readonly Point[],bottom:number,depth:number,color:string,scale=1,cx=0,cz=0) {
    const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(cx+(x-cx)*scale,-cz-(z-cz)*scale)));
    const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});
    geometry.rotateX(-Math.PI/2);geometries.add(geometry);
    const mesh=new T.Mesh(geometry,material(color));mesh.position.y=bottom;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  for(const [points,cx,cz] of [[MAIN_SHORE,0,0],[ISLET_SHORE,10.2,8.8]] as const) {
    land(points,-1.55,.24,'#6cbbb7',1.13,cx,cz); // Shallow-water shelf, below the dry sand.
    land(points,-1.50,.53,'#d7c59a',1.065,cx,cz);
    land(points,-1.1,1.1,'#949f92');
    land(points,0,.014,'#75965c',.995,cx,cz);
  }
  // Sandy building gardens stay flat; every slot can accept any facility after rearrangement.
  for(const [x,z] of PLOTS) {
    const patch=[[-2.9,-1.9],[-2.5,-2.5],[2.3,-2.5],[2.8,-1.8],[2.8,2.5],[1.9,3.4],[-2.8,3.1]].map(([dx,dz])=>[x+dx,z+dz]);
    land(patch,.015,.012,'#e4d6b2');
  }
  function beam(a:Point,b:Point,width:number,y:number,height:number,color:string) {
    const dx=b[0]-a[0],dz=b[1]-a[1];
    const mesh=box(root,color,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,height,Math.hypot(dx,dz));
    mesh.rotation.y=Math.atan2(dx,dz);return mesh;
  }
  for(const [a,b] of ROAD_EDGES) {
    if(a===BRIDGE_EDGE[0]&&b===BRIDGE_EDGE[1])continue;
    beam(ROAD_NODES[a],ROAD_NODES[b],ROAD_WIDTH+.16,.017,.025,'#bac1a0');
    beam(ROAD_NODES[a],ROAD_NODES[b],ROAD_WIDTH,.034,.026,'#e8dfc1');
  }
  for(const [x,z] of ROAD_NODES) cyl(root,'#e8dfc1',x,.033,z,ROAD_WIDTH*.53,.028);
  // A short timber bridge crosses the inlet; rails sit outside the truck's swept width.
  const a=ROAD_NODES[BRIDGE_EDGE[0]], b=ROAD_NODES[BRIDGE_EDGE[1]],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
  beam(a,b,2.25,-.1,.25,'#78523c');
  const steps=Math.ceil(length/.28);
  for(let i=0;i<=steps;i++) {
    const t=i/steps,x=a[0]+dx*t,z=a[1]+dz*t;
    const plank=box(root,i%3?'#ba9365':'#c9a879',x,.031,z,2.2,.035,.22);plank.rotation.y=Math.atan2(dx,dz);
    if(i%4===0||i===steps)for(const side of [-1,1])cyl(root,'#78523c',x+nx*side*1.05,-.48,z+nz*side*1.05,.065,2.22);
  }
  for(const side of [-1,1])beam([a[0]+nx*side*1.05,a[1]+nz*side*1.05],[b[0]+nx*side*1.05,b[1]+nz*side*1.05],.055,.46,.065,'#d6ba83');

  // Rocks, coastal planting and a small beacon give the shore a readable silhouette.
  for(const [points,cx,cz] of [[MAIN_SHORE,0,0],[ISLET_SHORE,10.2,8.8]] as const) {
    points.forEach(([x,z],i)=>{
      if(i%2)return;
      const rock=ball(root,i%3?'#9ba898':'#bcc2ae',cx+(x-cx)*1.05,-.94,cz+(z-cz)*1.05,.35+(i%3)*.12);
      rock.scale.y*=.75;rock.scale.x*=1.3;
    });
  }
  for(const [x,z,pink] of [[-10,7,0],[-4.2,12,1],[1.5,12,0],[12.9,9.3,1],[-10,-11.1,0],[9.1,-11.5,0],[1,-13.3,0],[9.8,-3.8,0]])tree(x,z,!!pink);
  cyl(root,'#bac0a7',-3.7,.14,-13.6,.85,.28);
  cyl(root,'#f1e6c9',-3.7,1,-13.6,.36,1.7);
  cyl(root,'#bb5f46',-3.7,1.3,-13.6,.37,.33);
  cyl(root,'#36575c',-3.7,1.94,-13.6,.47,.13);
  cyl(root,'#f1cf87',-3.7,2.17,-13.6,.28,.35);
  cyl(root,'#36575c',-3.7,2.4,-13.6,.43,.12);
  // Wide harbor pier joins the western shoreline without blocking the road or plots.
  box(root,'#78523c',-12.4,-.07,-2.5,4.1,.25,1.8);
  for(let x=-14.35;x<-10.35;x+=.28)box(root,'#b4885a',x,.074,-2.5,.22,.04,1.8);
  for(const x of [-14,-12,-10.5])for(const z of [-3.25,-1.75])cyl(root,'#78523c',x,-.50,z,.10,2.2);
}
