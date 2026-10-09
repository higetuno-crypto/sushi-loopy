import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FACILITIES } from '../data/facilities';
import { townTier, type Town } from '../logic/town';
import type { GameState } from '../types';

export const PLOTS = [[0,5],[6,5],[-6,5],[-6,-2],[-6,-9],[6,-9],[0,-9],[6,-2],[0,-2]] as const;
const cloth = {vermillion:'#b95643',indigo:'#426575',leaf:'#758354'};
const colors = {sand:'#e5d9b7',stone:'#b2bcb0',cream:'#f2e6ce',wood:'#78523c',timber:'#b4885a',roof:'#36575c',red:'#bb5f46',blue:'#64b9c0',ink:'#2f4141',leaf:'#6f966b',gold:'#d6ac60'};

/** Geometry is authored at one scale. Static parts are merged by material after assembly. */
export function buildTown(counts: GameState['facilityCounts'], town: Town) {
  const root=new T.Group(), materials=new Map<string,T.MeshStandardMaterial>(), geometries=new Set<T.BufferGeometry>();
  const animated: ((time:number,dt:number)=>void)[]=[];
  const targets: {key:string; point:T.Vector3}[]=[];
  const reactions=new Map<string,number>();
  let time=0;
  const material=(color:string)=>{
    if(!materials.has(color)) materials.set(color,new T.MeshStandardMaterial({color,roughness:.88,metalness:0}));
    return materials.get(color)!;
  };
  const cube=new T.BoxGeometry(1,1,1), cylinder=new T.CylinderGeometry(1,1,1,12), sphere=new T.IcosahedronGeometry(1,1), cone=new T.ConeGeometry(1,1,8);
  [cube,cylinder,sphere,cone].forEach(g=>geometries.add(g));
  function part(parent:T.Object3D,geometry:T.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number) {
    const mesh=new T.Mesh(geometry,material(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  const box=(p:T.Object3D,c:string,x:number,y:number,z:number,w:number,h:number,d:number)=>part(p,cube,c,x,y,z,w,h,d);
  const cyl=(p:T.Object3D,c:string,x:number,y:number,z:number,r:number,h:number)=>part(p,cylinder,c,x,y,z,r,h,r);
  const ball=(p:T.Object3D,c:string,x:number,y:number,z:number,r:number)=>part(p,sphere,c,x,y,z,r,r,r);
  const group=(parent:T.Object3D,x=0,y=0,z=0,dynamic=false)=>{const g=new T.Group();g.position.set(x,y,z);g.userData.dynamic=dynamic;parent.add(g);return g;};
  const position=(index:number)=>PLOTS[town.plots[index]];
  function tree(x:number,z:number,pink=false) {
    cyl(root,colors.wood,x,.6,z,.12,1.2);
    for(const [dx,dy,dz,r] of [[0,1.6,0,.85],[-.45,1.4,.15,.65],[.5,1.6,.1,.62],[0,2.15,0,.6]]) ball(root,pink?'#d5a9a1':colors.leaf,x+dx,dy,z+dz,r);
    cyl(root,colors.stone,x,.06,z,.8,.12);
  }
  function sushi(parent:T.Object3D,x:number,y:number,z:number,kind=0) {
    const plate=group(parent,x,y,z);
    cyl(plate,kind%2?'#698a8d':'#c7765d',0,.025,0,.23,.05);
    box(plate,'#fff0cc',0,.11,0,.3,.13,.16);
    box(plate,kind%3===1?'#e9ba57':'#df8a6c',0,.19,0,.36,.08,.2);
    for(const dx of [-.1,0,.1]) box(plate,'#f4bd91',dx,.235,0,.025,.008,.19);
    return plate;
  }
  function person(parent:T.Object3D,x:number,z:number,chef=false) {
    const p=group(parent,x,.12,z,true);
    box(p,colors.ink,-.12,.13,0,.16,.26,.22);box(p,colors.ink,.12,.13,0,.16,.26,.22);
    box(p,chef?'#f3efdb':'#bb745a',0,.46,0,.4,.48,.27);
    box(p,'#eed1a2',0,.88,0,.39,.4,.34);
    box(p,chef?'#fcf4da':'#453d35',0,1.09,0,.43,.12,.38);
    if(chef) {box(p,'#fcf4da',0,1.22,0,.34,.2,.3);box(p,colors.red,0,.63,.146,.4,.055,.015);}
    for(const dx of [-.09,.09]) box(p,colors.ink,dx,.91,.175,.035,.045,.01);
    const arm=group(p,.28,.63,0,true);box(arm,chef?'#f3efdb':'#bb745a',0,-.14,0,.14,.28,.16);ball(arm,'#eed1a2',0,-.3,0,.09);
    const other=group(p,-.28,.63,0,true);box(other,'#f3efdb',0,-.14,0,.14,.28,.16);ball(other,'#eed1a2',0,-.3,0,.09);
    if(chef) animated.push(t=>{
      const beat=t*1.26, press=Math.pow(Math.max(0,Math.sin(beat*Math.PI)),3);
      const greeting=t-(reactions.get('chef')??-99);
      arm.rotation.x=greeting<1.6?-2.5+Math.sin(greeting*9)*.22:-1.7+press*.35;
      other.rotation.x=-1.7+press*.35;
      p.rotation.y=greeting<1.6?-.15:.05*Math.sin(beat*Math.PI*.5);
    });
    return {p,arm};
  }
  function roof(parent:T.Object3D,y:number,width=4.6,depth=3.6) {
    // Two continuous pitched surfaces, with individually modeled tile ridges.
    for(const sign of [-1,1]) {
      const panel=group(parent,0,y,sign*depth/4);panel.rotation.x=sign*.34;
      box(panel,colors.roof,0,0,0,width,.16,depth*.54);
      for(let x=-width/2+.1;x<width/2;x+=.24) box(panel,'#45656a',x,.1,0,.065,.055,depth*.54);
      box(panel,colors.red,0,-.04,sign*depth*.26,width+.08,.18,.12);
    }
    box(parent,colors.roof,0,y+depth*.09,0,width+.2,.19,.22);
  }
  function lantern(parent:T.Object3D,x:number,y:number,z:number) {
    cyl(parent,'#f0c77c',x,y,z,.17,.38);cyl(parent,colors.wood,x,y+.23,z,.14,.08);cyl(parent,colors.wood,x,y-.23,z,.14,.08);
    for(const offset of [-.1,0,.1]) cyl(parent,'#d9a76c',x,y+offset,z,.175,.018);
  }
  function shop(parent:T.Object3D,index:number) {
    box(parent,colors.wood,0,.2,.5,4.2,.3,4.1);
    box(parent,colors.cream,0,1.35,-1.25,4,2.2,.18);
    box(parent,colors.cream,-1.92,1.25,0,.16,2,2.5);
    for(const x of [-2,-.75,.75,2]) box(parent,colors.wood,x,1.4,1.2,.14,2.6,.14);
    box(parent,colors.timber,0,.88,2.15,4.35,.18,.63);
    box(parent,colors.wood,0,.47,2.2,4,.7,.2);
    for(let x=-1.8;x<2;x+=.27) box(parent,colors.timber,x,.47,2.32,.04,.58,.03);
    box(parent,colors.wood,0,1.05,-1.15,3.7,.08,.45);
    for(let x=-1.45;x<1.7;x+=.55) {cyl(parent,colors.cream,x,1.17,-1.12,.13,.15);box(parent,colors.gold,x,1.4,-1.2,.2,.25,.08);}
    roof(parent,2.5);
    for(let i=0;i<5;i++)box(parent,cloth[town.color],-1.6+i*.8,2.02,1.6,.75,.46,.045);
    for(const x of [-1.85,1.85]) lantern(parent,x,1.9,1.82);
    // Painted physical sign, never a floating character speech bubble.
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#efe3c6';ctx.fillRect(0,0,512,128);ctx.fillStyle='#405044';ctx.font='600 46px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(index===0?town.name:'回転寿司',256,67,480);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const signMaterial=new T.MeshStandardMaterial({map:texture,roughness:1});
    const sign=new T.Mesh(new T.BoxGeometry(2.25,.5,.06),signMaterial);sign.position.set(0,2.48,1.82);parent.add(sign);geometries.add(sign.geometry);
    if(counts[FACILITIES[index].id]>0) {
      const chef=person(parent,-.65,1.65,true);chef.p.scale.setScalar(1.05);chef.p.position.y=.35;
      targets.push({key:'chef',point:new T.Vector3(position(index)[0]-.65,1.3,position(index)[1]+1.65)});
      if(index===0) {
        const plate=sushi(parent,.55,.99,2.22);plate.userData.dynamic=true;
        animated.push(t=>{const phase=(t*1.26)%3;plate.visible=phase>1.15;plate.position.z=phase<2? 1.92+(phase-1.15)*.35:2.22;});
      }
    }
    if(index===1) {
      box(parent,'#455a57',0,1.02,2.15,3.7,.09,.65);
      for(let i=0;i<6;i++) {
        const plate=sushi(parent,0,1.1,0,i);plate.userData.dynamic=true;
        animated.push(t=>{const a=t*.3+i*Math.PI/3;plate.position.set(Math.cos(a)*1.55,1.1,2.15+Math.sin(a)*.26);});
      }
      for(const x of [-1.25,0,1.25]) {cyl(parent,colors.red,x,.47,2.95,.27,.16);cyl(parent,colors.wood,x,.22,2.95,.09,.4);const customer=person(parent,x,2.95);customer.p.rotation.y=Math.PI;customer.p.scale.setScalar(.75);}
    }
  }
  function factory(parent:T.Object3D,index:number) {
    box(parent,colors.cream,0,.8,-.25,3.6,1.5,2.4);box(parent,colors.roof,0,1.6,-.25,3.9,.18,2.7);
    for(const x of [-1.2,0,1.2]) {box(parent,colors.roof,x,.9,1.0,.74,.73,.08);box(parent,'#8fc5c1',x,.94,1.05,.57,.49,.02);}
    box(parent,colors.red,-1.35,1.55,1.2,.55,.24,.07);
    if(index===2) {
      box(parent,colors.wood,0,.6,1.65,2.4,.18,.6);
      const arm=group(parent,0,1.85,.1,true);cyl(arm,colors.gold,0,0,0,.25,.2);box(arm,colors.roof,0,.45,0,.24,.9,.25);
      const elbow=group(arm,0,.9,0,true);box(elbow,colors.gold,0,0,.5,.2,.2,1.1);box(elbow,colors.ink,0,-.22,1,.18,.5,.18);
      animated.push(t=>{arm.rotation.y=Math.sin(t*.8)*.65;elbow.rotation.x=.1+Math.max(0,Math.sin(t*1.6))*.4;});
      sushi(parent,.8,.74,1.65);
    }
    if(index===3 || index===7) {
      for(const x of [-.95,.95]) {
        cyl(parent,colors.roof,x,2,-.15,.72,.18);cyl(parent,index===7?'#acd6d5':'#68b7bf',x,2.6,-.15,.62,1.2);
        for(const y of [2.12,3.12]) cyl(parent,'#e1ded0',x,y,-.15,.68,.09);
        cyl(parent,colors.blue,x,3.18,-.15,.59,.025);
        const float=group(parent,x,3.2,-.15,true);box(float,'#eae5cd',0,0,.15,.15,.06,.19);
        animated.push(t=>{float.position.y=3.2+Math.sin(t*.9+x)*.025;float.rotation.y=t*.14;});
        box(parent,colors.gold,x,2.2,.56,.13,.43,.13);
      }
      box(parent,colors.roof,0,2.15,-1.3,2.1,.18,.15);
    }
  }
  function crane(parent:T.Object3D) {
    box(parent,colors.wood,0,.2,0,4,.3,3);
    for(const x of [-1.4,1.4]) {box(parent,'#ad7d43',x,2,-.6,.24,3.6,.24);for(let y=.7;y<3.7;y+=.6)box(parent,colors.ink,x,y,-.6,.25,.15,.25);}
    box(parent,'#ad7d43',0,3.7,-.6,3.5,.24,.3);
    const load=group(parent,0,2.5,.2,true);box(load,colors.wood,0,0,0,.7,.5,.7);box(load,colors.gold,0,0,.36,.07,.5,.04);
    const cable=box(parent,colors.ink,0,3,-.05,.035,1.4,.035);cable.userData.dynamic=true;
    animated.push(t=>{load.position.y=1.5+Math.sin(t*.6)*.65;cable.scale.y=3.6-load.position.y;cable.position.y=(3.6+load.position.y)/2;});
  }
  function energy(parent:T.Object3D,index:number) {
    cyl(parent,colors.stone,0,.2,0,2,.4);cyl(parent,colors.roof,0,.52,0,1.65,.25);
    if(index===6) {
      const rocket=group(parent,0,.65,0,true);
      cyl(rocket,'#eee8d5',0,1.3,0,.42,2.6);part(rocket,cone,colors.red,0,2.9,0,.43,.65,.43);
      cyl(rocket,colors.red,0,.6,0,.43,.4);for(const x of [-.5,.5]) box(rocket,colors.red,x,.35,0,.2,.7,.35);
      ball(rocket,colors.blue,0,1.9,.4,.18);
      const exhaust=part(rocket,cone,colors.gold,0,-.5,0,.3,1,.3);exhaust.rotation.z=Math.PI;
      animated.push(t=>{const p=t%24;rocket.position.y=.65+(p>18?Math.pow(Math.min(p-18,4),2):0);rocket.visible=p<22;exhaust.visible=p>17&&p<22;});
      box(parent,colors.ink,-1,2,-.8,.18,4,.18);box(parent,colors.ink,-.55,3.65,-.8,1,.18,.18);
    } else {
      cyl(parent,colors.cream,0,1.25,0,1.05,1.25);ball(parent,index===5?'#de9b65':'#99bdbc',0,2.15,0,.83);
      const ring=group(parent,0,2.15,0,true);
      const geometry=new T.TorusGeometry(1.22,.07,6,40);geometries.add(geometry);const mesh=new T.Mesh(geometry,material(colors.gold));ring.add(mesh);
      ring.rotation.x=.8;animated.push(t=>{ring.rotation.y=t*.2;});
      for(const x of [-1.5,1.5]) {cyl(parent,colors.roof,x,1,0,.25,1.4);ball(parent,colors.gold,x,1.85,0,.2);}
    }
  }

  box(root,colors.stone,0,-.65,-1.8,22,1.3,25);
  box(root,colors.sand,0,-.07,-1.8,21.8,.14,24.8);
  // Quiet, wide lanes separate districts. Empty plots stay gardens until purchased.
  for(const z of [-5.5,1.5,8.5]) {
    box(root,'#b9b7a4',0,.015,z,20,.028,1.05);
    for(let x=-9.5;x<10;x+=1) box(root,'#efe7cd',x,.033,z,.42,.01,.04);
  }
  for(const x of [-9,3,9])box(root,'#b9b7a4',x,.015,1.5,1.05,.027,15);
  for(let z=-13.4;z<10.7;z+=1.2) for(const x of [-10.8,10.8])box(root,(Math.round(z*10)%2)?'#a4b2a9':'#bcc4b4',x,-.38,z,.45,.75,1.15);
  for(let x=-10;x<11;x+=1.2)box(root,colors.stone,x,-.38,10.6,1.15,.75,.45);
  for(const [x,z] of [[-9.5,6],[9.8,5],[-9.5,-9],[3,-9],[9.5,-12],[0,-12],[-3,9.8]])tree(x,z,x===-3);
  // Pier and a moored boat provide a real shoreline at the port.
  box(root,colors.wood,-12,.1,-2,4,.22,1.55);
  for(let x=-13.8;x<-10.2;x+=.25)box(root,colors.timber,x,.23,-2,.19,.05,1.55);
  for(const x of [-13.5,-11.5])for(const z of [-2.7,-1.3])cyl(root,colors.wood,x,-.1,z,.12,1.8);
  if(counts.sushi_ocean_mining>0) {
    const boat=group(root,-13.2,-.25,-4.2,true);box(boat,colors.red,0,0,0,1.7,.5,3);box(boat,colors.cream,0,.26,0,1.7,.2,3);box(boat,colors.roof,0,.45,.2,1.5,.15,2.6);box(boat,colors.cream,0,.9,-.4,1,1,1);box(boat,colors.blue,0,1,-.93,.75,.4,.03);cyl(boat,colors.wood,.3,1.8,-.35,.045,2.5);
    const flag=group(boat,.3,2.8,-.35,true);box(flag,colors.red,.3,0,0,.6,.3,.04);
    animated.push(t=>{const p=t-(reactions.get('boat')??-99);flag.rotation.y=Math.sin(t*1.2)*.08+(p<2?Math.sin(p*8)*.7:0);});
    animated.push(t=>{boat.position.y=-.25+Math.sin(t*.85)*.045;boat.rotation.z=Math.sin(t*.7)*.015;});
    targets.push({key:'boat',point:boat.position.clone()});
  }
  const builders=[shop,shop,factory,factory,crane,energy,energy,factory,energy];
  FACILITIES.forEach((f,index)=>{
    const [x,z]=position(index), owned=counts[f.id];
    if(owned===0 && index!==0) {tree(x,z);return;}
    const building=group(root,x,0,z);box(building,colors.stone,0,.05,0,4.8,.1,3.8);
    builders[index](building,index);
    targets.push({key:f.id,point:new T.Vector3(x,1,z)});
    for(let n=1;n<townTier(owned);n++) {box(building,colors.timber,2.12,.25,-1.5+n*.6,.4,.5,.4);lantern(building,-2.2,.85,-1.5+n*.65);}
  });
  const [shopX,shopZ]=position(0);
  if(town.bench) {
    box(root,colors.timber,shopX-2.9,.42,shopZ+1.1,.55,.13,1.6);box(root,colors.wood,shopX-3.15,.74,shopZ+1.1,.1,.55,1.6);
    for(const z of [-.5,.5])box(root,colors.wood,shopX-2.9,.2,shopZ+1.1+z,.4,.4,.12);
  }
  const cat=group(root,shopX-2.85,town.bench?.52:.1,shopZ+1.15,true);
  box(cat,'#d8a46b',0,.13,0,.32,.28,.52);ball(cat,'#ebc18b',0,.35,.23,.2);
  for(const x of [-.12,.12])part(cat,cone,'#b48558',x,.56,.24,.1,.18,.1);
  const tail=box(cat,'#b48558',0,.28,-.32,.08,.45,.08);tail.rotation.x=-.8;
  animated.push(t=>{const p=t-(reactions.get('cat')??-99);cat.rotation.y=p<1.8?Math.sin(p*Math.PI/1.8)*.4:0;tail.rotation.z=p<1.8?Math.sin(p*5)*.6:.15;});
  targets.push({key:'cat',point:new T.Vector3(shopX-2.85,1,shopZ+1.15)});

  let delivery: {truck:T.Group;cargo:T.Group;wheels:T.Mesh[];source:readonly number[];destination:readonly number[]}|null=null;
  if(counts.marine_food_plant>0) {
    const truck=group(root,0,0,0,true), wheels:T.Mesh[]=[];
    box(truck,colors.ink,0,.35,0,1.25,.17,2.1);
    box(truck,cloth[town.truckColor],0,.8,.64,1.15,.8,.84);
    box(truck,'#a7d6d3',0,1,.107,1.02,.38,.03);box(truck,'#a7d6d3',0,1,1.07,.92,.35,.03);
    for(const x of [-.58,.58])box(truck,'#a7d6d3',x,1,.67,.03,.36,.59);
    box(truck,colors.cream,0,.52,-.48,1.17,.13,1.26);
    for(const x of [-.56,.56])box(truck,cloth[town.truckColor],x,.71,-.48,.07,.3,1.25);
    for(const x of [-.39,.39])box(truck,'#f7e3a6',x,.61,1.081,.18,.13,.04);
    const driver=group(truck,.52,1,.62,true);box(driver,'#eed1a2',0,0,0,.16,.18,.17);
    const wave=group(driver,.1,-.12,0,true);box(wave,'#eed1a2',.1,0,0,.2,.09,.09);
    animated.push(t=>{const p=t-(reactions.get('truck')??-99);wave.rotation.z=p<2?.7+Math.sin(p*10)*.45:0;});
    for(const x of [-.63,.63])for(const z of [-.67,.7]) {const wheel=cyl(truck,colors.ink,x,.27,z,.26,.16);wheel.rotation.z=Math.PI/2;wheels.push(wheel);const hub=cyl(truck,colors.cream,x*1.12,.27,z,.11,.03);hub.rotation.z=Math.PI/2;}
    const cargo=group(truck,0,.76,-.48,true);for(const x of [-.25,.25]){box(cargo,colors.timber,x,0,0,.43,.37,.64);for(const z of [-.2,.2])box(cargo,colors.gold,x,.02,z,.45,.055,.07);}
    delivery={truck,cargo,wheels,source:position(3),destination:position(0)};
    targets.push({key:'truck',point:truck.position});
  }

  root.updateMatrixWorld(true);
  const buckets=new Map<T.Material,T.BufferGeometry[]>(), remove:T.Mesh[]=[];
  root.traverse(object=>{
    if(!(object instanceof T.Mesh)||Array.isArray(object.material))return;
    let ancestor:T.Object3D|null=object;while(ancestor){if(ancestor.userData.dynamic)return;ancestor=ancestor.parent;}
    const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
    const bucket=buckets.get(object.material)??[];bucket.push(geometry);buckets.set(object.material,bucket);remove.push(object);
  });
  for(const mesh of remove)mesh.removeFromParent();
  for(const [mat,parts] of buckets) {
    const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    if(merged){geometries.add(merged);const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  }
  return {root,targets,delivery,position,
    tick(t:number,dt:number){time=t;animated.forEach(update=>update(t,dt));},
    react(key:string){reactions.set(key,time);},
    dispose(){
      const textures=new Set<T.Texture>(),mats=new Set<T.Material>();
      root.traverse(obj=>{if(obj instanceof T.Mesh){geometries.add(obj.geometry);const list=Array.isArray(obj.material)?obj.material:[obj.material];list.forEach(m=>{mats.add(m);if(m instanceof T.MeshStandardMaterial&&m.map)textures.add(m.map);});}});
      geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    },
  };
}
